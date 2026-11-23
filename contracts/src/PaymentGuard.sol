// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PayeeRegistry} from "./PayeeRegistry.sol";
import {IERC20} from "./token/IERC20.sol";
import {ReentrancyGuard} from "./utils/ReentrancyGuard.sol";

/**
 * @title PaymentGuard
 * @notice CoP-enforcing payment rail + scoped agent payment sessions for QDay Aevum.
 *
 * Two entry points:
 *
 * 1. executeGuarded() — a human (or script) pays a payee in tUSD8 through the guard.
 *    The registry check runs first; in `Enforce` mode a NoMatch/NotFound reverts on-chain.
 *    Every attempt — blocked or not — emits an event, giving a verifiable audit trail.
 *
 * 2. agentPay() — an autonomous agent spends FROM its owner's balance inside a session
 *    that is bounded on-chain by: per-tx limit, lifetime cap, expiry, and revocation.
 *    Agents are ALWAYS enforced (no warn mode for autonomous spend): the guard will not
 *    execute a payment whose payee-name check fails. This is least-privilege by design:
 *    limits are enforced by this contract at execution time, not by the agent's code.
 *
 * Flow of funds: tokens move directly payer -> payee via `transferFrom`. The guard never
 * custody funds; the payer approves the guard for exactly the amount they intend to move.
 */
contract PaymentGuard is ReentrancyGuard {
    // ------------------------------------------------------------------
    // Types
    // ------------------------------------------------------------------

    enum GuardMode {
        Warn, // 0: never blocks, only flags (interactive flows)
        Enforce // 1: reverts on NoMatch / NotFound
    }

    struct Session {
        address ownerAddr; // whose funds the agent may spend
        address agent; // key allowed to call agentPay()
        address token; // ERC-20 spent by this session (e.g. tUSD8)
        uint256 maxPerTx; // hard cap per payment
        uint256 capTotal; // lifetime cap for the session
        uint256 spentTotal; // lifetime spent so far
        uint64 expiresAt; // session becomes invalid after this
        bool active; // false once revoked or expired
        GuardMode mode; // agent sessions are semantically always Enforce
    }

    // ------------------------------------------------------------------
    // Storage
    // ------------------------------------------------------------------

    PayeeRegistry public immutable registry;
    uint256 public sessionCount;
    mapping(uint256 => Session) public sessions;
    mapping(address => uint256[]) private _sessionIdsOf;

    // ------------------------------------------------------------------
    // Events — every check, payment and block is on the audit trail
    // ------------------------------------------------------------------

    event GuardCheck(
        address indexed payer,
        address indexed payee,
        string expectedName,
        uint8 result,
        uint8 mode,
        bool blocked
    );
    event PaymentExecuted(
        address indexed payer, address indexed payee, address token, uint256 amount, uint8 result, string matchedAs
    );
    event PaymentBlocked(
        address indexed payer, address indexed payee, string expectedName, uint8 result, string reason
    );
    event SessionCreated(
        uint256 indexed sessionId,
        address indexed owner,
        address indexed agent,
        address token,
        uint256 maxPerTx,
        uint256 capTotal,
        uint64 expiresAt
    );
    event SessionCapIncreased(uint256 indexed sessionId, uint256 newCapTotal);
    event SessionRevoked(uint256 indexed sessionId, address indexed owner);
    event AgentPaymentExecuted(
        uint256 indexed sessionId,
        address indexed owner,
        address indexed agent,
        address payee,
        address token,
        uint256 amount,
        uint8 result,
        string matchedAs
    );
    event AgentPaymentBlocked(
        uint256 indexed sessionId,
        address indexed owner,
        address indexed agent,
        address payee,
        string expectedName,
        uint8 result
    );

    // ------------------------------------------------------------------
    // Errors
    // ------------------------------------------------------------------

    error InvalidAmount();
    error InvalidSessionParams();
    error BlockedByGuard(uint8 result, string expectedName);
    error TransferFailed();
    error NotAgent();
    error NotSessionOwner();
    error SessionNotActive();
    error SessionExpired();
    error ExceedsPerTxLimit();
    error ExceedsCapLimit();

    // ------------------------------------------------------------------

    constructor(address registry_) {
        registry = PayeeRegistry(registry_);
    }

    // ------------------------------------------------------------------
    // 1) Interactive guarded payment
    // ------------------------------------------------------------------

    /**
     * @notice Pay `payee` `amount` of `token` after running the Confirmation-of-Payee check.
     *         Caller must have approved this contract for `amount` of `token`.
     * @param mode Warn = proceed but flag mismatches; Enforce = revert on NoMatch/NotFound.
     * @return result_ the CoP verdict that was recorded (3 = FullMatch, 2 = CloseMatch).
     */
    function executeGuarded(
        address token,
        address payee,
        string calldata expectedName,
        uint256 amount,
        GuardMode mode
    ) external nonReentrant returns (uint8 result_) {
        if (amount == 0) revert InvalidAmount();

        (PayeeRegistry.MatchResult result, string memory matchedAs,) =
            registry.checkPayee(payee, expectedName);
        bool isBad = result == PayeeRegistry.MatchResult.NoMatch
            || result == PayeeRegistry.MatchResult.NotFound;

        emit GuardCheck(msg.sender, payee, expectedName, uint8(result), uint8(mode), isBad && mode == GuardMode.Enforce);

        if (isBad && mode == GuardMode.Enforce) {
            emit PaymentBlocked(msg.sender, payee, expectedName, uint8(result), "payee-name mismatch");
            revert BlockedByGuard(uint8(result), expectedName);
        }

        _transfer(token, msg.sender, payee, amount);
        emit PaymentExecuted(msg.sender, payee, token, amount, uint8(result), matchedAs);
        return uint8(result);
    }

    // ------------------------------------------------------------------
    // 2) Scoped agent sessions (least-privilege autonomous spend)
    // ------------------------------------------------------------------

    /**
     * @notice Owner creates a bounded session that lets `agent` spend the owner's tokens.
     *         Owner must approve this contract for `capTotal` of `token` beforehand.
     */
    function createSession(
        address agent,
        address token,
        uint256 maxPerTx,
        uint256 capTotal,
        uint64 duration,
        GuardMode mode
    ) external returns (uint256 sessionId) {
        if (agent == address(0) || token == address(0)) revert InvalidSessionParams();
        if (maxPerTx == 0 || capTotal == 0 || maxPerTx > capTotal) revert InvalidSessionParams();
        if (duration == 0) revert InvalidSessionParams();

        sessionId = sessionCount++;
        Session storage s = sessions[sessionId];
        s.ownerAddr = msg.sender;
        s.agent = agent;
        s.token = token;
        s.maxPerTx = maxPerTx;
        s.capTotal = capTotal;
        s.expiresAt = uint64(block.timestamp) + duration;
        s.active = true;
        s.mode = mode;

        _sessionIdsOf[msg.sender].push(sessionId);
        emit SessionCreated(sessionId, msg.sender, agent, token, maxPerTx, capTotal, s.expiresAt);
    }

    /**
     * @notice Agent pays `payee` from the session owner's balance, inside the session's
     *         hard limits. The CoP check ALWAYS gates autonomous spend: mismatches are
     *         blocked on-chain and the attempt is permanently recorded.
     */
    function agentPay(uint256 sessionId, address payee, string calldata expectedName, uint256 amount)
        external
        nonReentrant
        returns (uint8 result_)
    {
        Session storage s = sessions[sessionId];
        if (msg.sender != s.agent) revert NotAgent();
        if (!s.active) revert SessionNotActive();
        if (block.timestamp > s.expiresAt) revert SessionExpired();
        if (amount == 0) revert InvalidAmount();
        if (amount > s.maxPerTx) revert ExceedsPerTxLimit();
        if (s.spentTotal + amount > s.capTotal) revert ExceedsCapLimit();

        (PayeeRegistry.MatchResult result, string memory matchedAs,) =
            registry.checkPayee(payee, expectedName);
        bool isBad = result == PayeeRegistry.MatchResult.NoMatch
            || result == PayeeRegistry.MatchResult.NotFound;

        emit GuardCheck(s.ownerAddr, payee, expectedName, uint8(result), uint8(GuardMode.Enforce), isBad);

        if (isBad) {
            emit AgentPaymentBlocked(sessionId, s.ownerAddr, msg.sender, payee, expectedName, uint8(result));
            revert BlockedByGuard(uint8(result), expectedName);
        }

        _transfer(s.token, s.ownerAddr, payee, amount);
        s.spentTotal += amount;
        emit AgentPaymentExecuted(sessionId, s.ownerAddr, msg.sender, payee, s.token, amount, uint8(result), matchedAs);
        return uint8(result);
    }

    /// @notice Session owner revokes the session instantly — remaining cap is dead.
    function revokeSession(uint256 sessionId) external {
        Session storage s = sessions[sessionId];
        if (msg.sender != s.ownerAddr) revert NotSessionOwner();
        if (!s.active) revert SessionNotActive();
        s.active = false;
        emit SessionRevoked(sessionId, msg.sender);
    }

    /// @notice Owner tops up the lifetime cap of an active session.
    function increaseSessionCap(uint256 sessionId, uint256 addAmount) external {
        Session storage s = sessions[sessionId];
        if (msg.sender != s.ownerAddr) revert NotSessionOwner();
        if (addAmount == 0) revert InvalidAmount();
        s.capTotal += addAmount;
        emit SessionCapIncreased(sessionId, s.capTotal);
    }

    // ------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------

    function getSessionIds(address ownerAddr) external view returns (uint256[] memory) {
        return _sessionIdsOf[ownerAddr];
    }

    function sessionUsage(uint256 sessionId) external view returns (uint256 spent, uint256 cap, bool active, uint64 expiresAt) {
        Session storage s = sessions[sessionId];
        return (s.spentTotal, s.capTotal, s.active && block.timestamp <= s.expiresAt, s.expiresAt);
    }

    // ------------------------------------------------------------------
    // Internal
    // ------------------------------------------------------------------

    function _transfer(address token, address from, address to, uint256 amount) internal {
        bool ok = IERC20(token).transferFrom(from, to, amount);
        if (!ok) revert TransferFailed();
    }
}
