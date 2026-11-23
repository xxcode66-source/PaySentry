// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {PayeeRegistry} from "../src/PayeeRegistry.sol";
import {PaymentGuard} from "../src/PaymentGuard.sol";
import {IERC20} from "../src/token/IERC20.sol";

/// @dev Minimal 6-decimal mock mimicking the tUSD8 stablecoin.
contract MockStablecoin is IERC20 {
    string public constant name = "Mock USD8";
    string public constant symbol = "mUSD8";
    uint8 public constant decimals = 6;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 a = allowance[from][msg.sender];
        require(a >= amount, "insufficient allowance");
        if (a != type(uint256).max) allowance[from][msg.sender] = a - amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}

contract PaySentryTest is Test {
    PayeeRegistry internal registry;
    PaymentGuard internal guard;
    MockStablecoin internal usd;

    address internal owner = makeAddr("owner"); // deployer + verifier
    address internal payer = makeAddr("payer");
    address internal payee = makeAddr("payee");
    address internal agent = makeAddr("agent");
    address internal stranger = makeAddr("stranger");

    function setUp() public {
        vm.prank(owner);
        registry = new PayeeRegistry();
        guard = new PaymentGuard(address(registry));
        usd = new MockStablecoin();
        usd.mint(payer, 10_000e6);
    }

    // ------------------------------------------------------------------
    // PayeeRegistry: normalization & matching
    // ------------------------------------------------------------------

    function test_RegisterPayee_selfClaimed() public {
        vm.prank(payee);
        registry.registerPayee("Budi Santoso");

        (string memory dn,, uint8 level,) = registry.payeeOf(payee);
        assertEq(dn, "Budi Santoso");
        assertEq(level, uint8(PayeeRegistry.VerificationLevel.SelfClaimed));
    }

    function test_CheckPayee_exactMatch() public {
        vm.prank(payee);
        registry.registerPayee("Budi Santoso");
        (PayeeRegistry.MatchResult r, string memory m,) = registry.checkPayee(payee, "Budi Santoso");
        assertEq(uint8(r), uint8(PayeeRegistry.MatchResult.FullMatch));
        assertEq(m, "Budi Santoso");
    }

    function test_CheckPayee_normalizationMakesExactMatch() public {
        vm.prank(payee);
        registry.registerPayee("Budi Santoso");
        // case-insensitive, punctuation stripped, whitespace collapsed
        (PayeeRegistry.MatchResult r,,) = registry.checkPayee(payee, "  budi  santoso !!! ");
        assertEq(uint8(r), uint8(PayeeRegistry.MatchResult.FullMatch));
    }

    function test_CheckPayee_typoIsCloseMatch() public {
        vm.prank(payee);
        registry.registerPayee("Budi Santoso");
        // distance 1 on a 12-char name, threshold 2 => CloseMatch
        (PayeeRegistry.MatchResult r,,) = registry.checkPayee(payee, "Budi Santosa");
        assertEq(uint8(r), uint8(PayeeRegistry.MatchResult.CloseMatch));
    }

    function test_CheckPayee_wrongNameIsNoMatch() public {
        vm.prank(payee);
        registry.registerPayee("Budi Santoso");
        (PayeeRegistry.MatchResult r,,) = registry.checkPayee(payee, "Totally Different");
        assertEq(uint8(r), uint8(PayeeRegistry.MatchResult.NoMatch));
    }

    function test_CheckPayee_unknownAddressIsNotFound() public {
        (PayeeRegistry.MatchResult r,,) = registry.checkPayee(stranger, "Anyone");
        assertEq(uint8(r), uint8(PayeeRegistry.MatchResult.NotFound));
    }

    function test_CheckPayee_shortNameMustBeExact() public {
        vm.prank(payee);
        registry.registerPayee("Ali");
        // length 3 => threshold 0 => any typo is NoMatch
        (PayeeRegistry.MatchResult r,,) = registry.checkPayee(payee, "Alu");
        assertEq(uint8(r), uint8(PayeeRegistry.MatchResult.NoMatch));
    }

    function test_Attestation_enablesAlternateName() public {
        vm.prank(payee);
        registry.registerPayee("Budi Santoso");
        vm.prank(owner);
        registry.attest(payee, "BS Mart");

        (PayeeRegistry.MatchResult r, string memory m,) = registry.checkPayee(payee, "bs mart");
        assertEq(uint8(r), uint8(PayeeRegistry.MatchResult.FullMatch));
        assertEq(m, "BS Mart");

        (,, uint8 level,) = registry.payeeOf(payee);
        assertEq(level, uint8(PayeeRegistry.VerificationLevel.Attested));
    }

    function test_Attestation_onlyVerifierCanAttest() public {
        vm.prank(stranger);
        vm.expectRevert(PayeeRegistry.NotVerifier.selector);
        registry.attest(payee, "BS Mart");
    }

    function test_Attestation_duplicateReverts() public {
        vm.prank(owner);
        registry.attest(payee, "BS Mart");
        vm.prank(owner);
        vm.expectRevert(PayeeRegistry.DuplicateAttestation.selector);
        registry.attest(payee, "b.s. mart"); // same normalized name
    }

    function test_RevokeAttestation_restoresSelfClaimed() public {
        vm.prank(payee);
        registry.registerPayee("Budi Santoso");
        vm.prank(owner);
        registry.attest(payee, "BS Mart");
        vm.prank(owner);
        registry.revokeAttestation(payee, "BS Mart");

        (,, uint8 level,) = registry.payeeOf(payee);
        assertEq(level, uint8(PayeeRegistry.VerificationLevel.SelfClaimed));
        (PayeeRegistry.MatchResult r,,) = registry.checkPayee(payee, "BS Mart");
        assertTrue(r != PayeeRegistry.MatchResult.FullMatch);
    }

    function test_NormalizedEmptyName_reverts() public {
        vm.prank(payee);
        vm.expectRevert(PayeeRegistry.EmptyName.selector);
        registry.registerPayee("   !!!  ");
    }

    // ------------------------------------------------------------------
    // PaymentGuard: interactive guarded payment
    // ------------------------------------------------------------------

    function _registerPayee() internal {
        vm.prank(payee);
        registry.registerPayee("Warung Maju Jaya");
    }

    function test_ExecuteGuarded_warnModeAllowsMismatchButFlags() public {
        _registerPayee();
        vm.prank(payer);
        usd.approve(address(guard), 5e6);

        vm.prank(payer);
        uint8 r = guard.executeGuarded(
            address(usd), payee, "Wrong Name", 5e6, PaymentGuard.GuardMode.Warn
        );
        assertEq(r, uint8(PayeeRegistry.MatchResult.NoMatch));
        assertEq(usd.balanceOf(payee), 5e6); // still paid, but flagged on-chain
    }

    function test_ExecuteGuarded_enforceModeBlocksMismatch() public {
        _registerPayee();
        vm.prank(payer);
        usd.approve(address(guard), 5e6);

        vm.prank(payer);
        vm.expectRevert(
            abi.encodeWithSelector(
                PaymentGuard.BlockedByGuard.selector,
                uint8(PayeeRegistry.MatchResult.NoMatch),
                "Wrong Name"
            )
        );
        guard.executeGuarded(address(usd), payee, "Wrong Name", 5e6, PaymentGuard.GuardMode.Enforce);
        assertEq(usd.balanceOf(payee), 0); // funds did NOT move
    }

    function test_ExecuteGuarded_enforceModeAllowsMatch() public {
        _registerPayee();
        vm.prank(payer);
        usd.approve(address(guard), 5e6);

        vm.prank(payer);
        uint8 r = guard.executeGuarded(
            address(usd), payee, "warung maju jaya", 5e6, PaymentGuard.GuardMode.Enforce
        );
        assertEq(r, uint8(PayeeRegistry.MatchResult.FullMatch));
        assertEq(usd.balanceOf(payee), 5e6);
    }

    function test_GuardCheckEvent_emittedForEveryAttempt() public {
        _registerPayee();
        vm.prank(payer);
        usd.approve(address(guard), 5e6);

        vm.expectEmit(true, true, false, true, address(guard));
        emit PaymentGuard.GuardCheck(payer, payee, "Wrong Name", 1, 0, false);
        vm.prank(payer);
        guard.executeGuarded(address(usd), payee, "Wrong Name", 1e6, PaymentGuard.GuardMode.Warn);
    }

    // ------------------------------------------------------------------
    // PaymentGuard: agent sessions — least privilege, hard caps
    // ------------------------------------------------------------------

    function _createSession() internal returns (uint256 id) {
        _registerPayee();
        vm.prank(payer);
        usd.approve(address(guard), 50e6);
        vm.prank(payer);
        id = guard.createSession(
            agent, address(usd), 5e6 /* maxPerTx */, 50e6 /* capTotal */, 1 days, PaymentGuard.GuardMode.Enforce
        );
    }

    function test_AgentPay_withinLimits_succeeds() public {
        uint256 id = _createSession();
        vm.prank(agent);
        guard.agentPay(id, payee, "Warung Maju Jaya", 5e6);
        assertEq(usd.balanceOf(payee), 5e6);

        (uint256 spent, uint256 cap, bool active,) = guard.sessionUsage(id);
        assertEq(spent, 5e6);
        assertEq(cap, 50e6);
        assertTrue(active);
    }

    function test_AgentPay_blockedOnNameMismatch() public {
        uint256 id = _createSession();
        vm.prank(agent);
        vm.expectRevert();
        guard.agentPay(id, payee, "Impostor Name", 5e6);
        assertEq(usd.balanceOf(payee), 0);
    }

    function test_AgentPay_blockedOnUnknownPayee() public {
        uint256 id = _createSession();
        vm.prank(agent);
        vm.expectRevert();
        guard.agentPay(id, stranger, "Ghost Merchant", 1e6);
    }

    function test_AgentPay_nonAgentReverts() public {
        uint256 id = _createSession();
        vm.prank(stranger);
        vm.expectRevert(PaymentGuard.NotAgent.selector);
        guard.agentPay(id, payee, "Warung Maju Jaya", 1e6);
    }

    function test_AgentPay_perTxLimitEnforced() public {
        uint256 id = _createSession();
        vm.prank(agent);
        vm.expectRevert(PaymentGuard.ExceedsPerTxLimit.selector);
        guard.agentPay(id, payee, "Warung Maju Jaya", 6e6); // > 5e6 maxPerTx
    }

    function test_AgentPay_lifetimeCapEnforced_exact() public {
        _registerPayee();
        vm.prank(payer);
        usd.approve(address(guard), 12e6);
        vm.prank(payer);
        uint256 id = guard.createSession(
            agent, address(usd), 10e6, 11e6, 1 days, PaymentGuard.GuardMode.Enforce
        );
        vm.startPrank(agent);
        guard.agentPay(id, payee, "Warung Maju Jaya", 10e6); // spent = 10
        vm.expectRevert(PaymentGuard.ExceedsCapLimit.selector);
        guard.agentPay(id, payee, "Warung Maju Jaya", 2e6); // 10 + 2 > 11 cap
        vm.stopPrank();
    }

    function test_AgentPay_sessionExpiryEnforced() public {
        uint256 id = _createSession();
        vm.warp(block.timestamp + 1 days + 1);
        vm.prank(agent);
        vm.expectRevert(PaymentGuard.SessionExpired.selector);
        guard.agentPay(id, payee, "Warung Maju Jaya", 1e6);
    }

    function test_RevokeSession_killsSpendingInstantly() public {
        uint256 id = _createSession();
        vm.prank(payer);
        guard.revokeSession(id);
        vm.prank(agent);
        vm.expectRevert(PaymentGuard.SessionNotActive.selector);
        guard.agentPay(id, payee, "Warung Maju Jaya", 1e6);
    }

    function test_RevokeSession_onlyOwnerCanRevoke() public {
        uint256 id = _createSession();
        vm.prank(stranger);
        vm.expectRevert(PaymentGuard.NotSessionOwner.selector);
        guard.revokeSession(id);
    }

    function test_CapIncrease_byOwnerOnly() public {
        uint256 id = _createSession();
        vm.prank(payer);
        guard.increaseSessionCap(id, 10e6);
        (, uint256 cap,,) = guard.sessionUsage(id);
        assertEq(cap, 60e6);
    }

    function test_SessionIds_trackedPerOwner() public {
        uint256 id = _createSession();
        uint256[] memory ids = guard.getSessionIds(payer);
        assertEq(ids.length, 1);
        assertEq(ids[0], id);
    }

    // ------------------------------------------------------------------
    // Fuzz: matcher never returns FullMatch for distance > 0
    // ------------------------------------------------------------------

    function testFuzz_NoFalseFullMatch(bytes memory rawName) public {
        vm.prank(payee);
        registry.registerPayee("Exactname Twelve");
        bytes memory norm = bytes(rawName);
        if (norm.length == 0 || norm.length > 64) return;
        (PayeeRegistry.MatchResult r,,) = registry.checkPayee(payee, string(norm));
        // FullMatch only if normalization collapses it to the registered name
        if (r == PayeeRegistry.MatchResult.FullMatch) {
            assertEq(_normOffchain(string(norm)), "exactname twelve");
        }
    }

    function _normOffchain(string memory s) internal pure returns (string memory) {
        bytes memory b = bytes(s);
        bytes memory outB = new bytes(b.length);
        uint256 k;
        bool lastSpace = true;
        for (uint256 i = 0; i < b.length; i++) {
            uint8 c = uint8(b[i]);
            if (c >= 65 && c <= 90) c += 32;
            bool keep = (c >= 97 && c <= 122) || (c >= 48 && c <= 57);
            if (keep) {
                outB[k++] = bytes1(c);
                lastSpace = false;
            } else if (c == 32 && !lastSpace) {
                outB[k++] = 0x20;
                lastSpace = true;
            }
        }
        if (k > 0 && outB[k - 1] == 0x20) k--;
        assembly {
            mstore(outB, k)
        }
        return string(outB);
    }
}
