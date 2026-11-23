// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PayeeRegistry
 * @notice Trustless Confirmation-of-Payee registry for stablecoin payments on QDay Aevum.
 *
 * A Confirmation of Payee (CoP) system answers one question before money moves:
 *   "Does this address really belong to the person/business the payer intends to pay?"
 *
 * This contract stores payee identities on-chain and exposes a single primitive,
 * `checkPayee(payee, name)`, that returns a bank-grade verdict:
 *   NotFound  — the address is unknown to the registry at all
 *   NoMatch   — address is known, but the name does not match
 *   CloseMatch— a near match (typo-level distance) is present
 *   FullMatch — normalized names are identical
 *
 * Identity sources:
 *   1. Self-claimed: a payee registers their own display name.
 *   2. Attested: trusted verifiers endorse `address -> name` pairs
 *      (a federated model — verifiers can be KYC providers, DAOs, marketplaces).
 *
 * Matching is deterministic and gas-bounded: names are normalized
 * (lowercased, punctuation stripped, whitespace collapsed, ASCII-only) and compared
 * with a bounded Levenshtein distance, mirroring UK/EU Confirmation-of-Payee semantics.
 *
 * Zero off-chain dependencies: the registry IS the database.
 */
contract PayeeRegistry {
    // ------------------------------------------------------------------
    // Types
    // ------------------------------------------------------------------

    enum MatchResult {
        NotFound, // 0: address unknown to the registry
        NoMatch, //  1: address known, name does not match
        CloseMatch, // 2: near match (typo-level distance)
        FullMatch //  3: exact match after normalization
    }

    enum VerificationLevel {
        None, // 0
        SelfClaimed, // 1: registered by the payee itself
        Attested // 2: endorsed by at least one verifier
    }

    struct Payee {
        string displayName; // self-claimed name (raw, as submitted)
        bool registered;
        uint64 registeredAt;
        VerificationLevel level;
    }

    // ------------------------------------------------------------------
    // Storage
    // ------------------------------------------------------------------

    address public owner;
    mapping(address => bool) public isVerifier;
    address[] private _verifierList;

    mapping(address => Payee) private _payees;
    mapping(address => string[]) private _attestedNames; // verifier-endorsed alt names
    mapping(address => mapping(bytes32 => bool)) private _hasAttestation;
    mapping(address => uint256) public attestationCount;

    uint256 public constant MAX_NAME_LENGTH = 64; // normalized length cap (gas bound)
    uint256 public constant MAX_ALTERNATE_NAMES = 8;

    // ------------------------------------------------------------------
    // Events (on-chain audit trail — indexed, free to query, no indexer required)
    // ------------------------------------------------------------------

    event PayeeRegistered(address indexed payee, string displayName, uint64 timestamp);
    event PayeeAttested(address indexed verifier, address indexed payee, string name);
    event AttestationRevoked(address indexed verifier, address indexed payee, string name);
    event VerifierAdded(address indexed verifier);
    event VerifierRemoved(address indexed verifier);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ------------------------------------------------------------------
    // Errors
    // ------------------------------------------------------------------

    error OnlyOwner();
    error NotVerifier();
    error EmptyName();
    error NameTooLong();
    error AlreadyVerifier();
    error NotAVerifier();
    error DuplicateAttestation();
    error NoSuchAttestation();
    error TooManyAlternateNames();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier onlyVerifier() {
        if (!isVerifier[msg.sender]) revert NotVerifier();
        _;
    }

    constructor() {
        owner = msg.sender;
        isVerifier[msg.sender] = true;
        _verifierList.push(msg.sender);
        emit VerifierAdded(msg.sender);
    }

    // ------------------------------------------------------------------
    // Payee self-registration
    // ------------------------------------------------------------------

    /// @notice Register (or update) the caller's display name. Self-claimed level.
    function registerPayee(string calldata displayName) external {
        bytes memory norm = _normalize(displayName);
        if (norm.length == 0) revert EmptyName();
        if (norm.length > MAX_NAME_LENGTH) revert NameTooLong();

        Payee storage p = _payees[msg.sender];
        p.displayName = displayName;
        if (!p.registered) {
            p.registered = true;
            p.registeredAt = uint64(block.timestamp);
            if (p.level == VerificationLevel.None) p.level = VerificationLevel.SelfClaimed;
        }
        emit PayeeRegistered(msg.sender, displayName, uint64(block.timestamp));
    }

    // ------------------------------------------------------------------
    // Verifier attestations (federated trust model)
    // ------------------------------------------------------------------

    /// @notice Verifier endorses that `payee` is known as `name` (adds an alternate name).
    function attest(address payee, string calldata name) external onlyVerifier {
        bytes memory norm = _normalize(name);
        if (norm.length == 0) revert EmptyName();
        if (norm.length > MAX_NAME_LENGTH) revert NameTooLong();

        bytes32 h = keccak256(norm);
        if (_hasAttestation[payee][h]) revert DuplicateAttestation();
        if (_attestedNames[payee].length >= MAX_ALTERNATE_NAMES) revert TooManyAlternateNames();

        _attestedNames[payee].push(name);
        _hasAttestation[payee][h] = true;
        attestationCount[payee] += 1;

        _payees[payee].level = VerificationLevel.Attested;
        emit PayeeAttested(msg.sender, payee, name);
    }

    /// @notice Verifier withdraws a previous attestation.
    function revokeAttestation(address payee, string calldata name) external onlyVerifier {
        bytes32 h = keccak256(_normalize(name));
        if (!_hasAttestation[payee][h]) revert NoSuchAttestation();

        string[] storage names = _attestedNames[payee];
        bytes32 target = keccak256(_normalize(name));
        for (uint256 i = 0; i < names.length; i++) {
            if (keccak256(_normalize(names[i])) == target) {
                names[i] = names[names.length - 1];
                names.pop();
                break;
            }
        }
        _hasAttestation[payee][h] = false;
        attestationCount[payee] -= 1;

        Payee storage p = _payees[payee];
        if (attestationCount[payee] == 0) {
            p.level = p.registered ? VerificationLevel.SelfClaimed : VerificationLevel.None;
        }
        emit AttestationRevoked(msg.sender, payee, name);
    }

    // ------------------------------------------------------------------
    // Verifier management
    // ------------------------------------------------------------------

    function addVerifier(address v) external onlyOwner {
        if (isVerifier[v]) revert AlreadyVerifier();
        isVerifier[v] = true;
        _verifierList.push(v);
        emit VerifierAdded(v);
    }

    function removeVerifier(address v) external onlyOwner {
        if (!isVerifier[v]) revert NotAVerifier();
        isVerifier[v] = false;
        uint256 n = _verifierList.length;
        for (uint256 i = 0; i < n; i++) {
            if (_verifierList[i] == v) {
                _verifierList[i] = _verifierList[n - 1];
                _verifierList.pop();
                break;
            }
        }
        emit VerifierRemoved(v);
    }

    function verifiers() external view returns (address[] memory) {
        return _verifierList;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        address prev = owner;
        owner = newOwner;
        emit OwnershipTransferred(prev, newOwner);
    }

    // ------------------------------------------------------------------
    // THE Confirmation-of-Payee check — the core primitive of the protocol
    // ------------------------------------------------------------------

    /**
     * @notice Check whether `payee` matches the intended recipient `name`.
     * @return result  NotFound / NoMatch / CloseMatch / FullMatch
     * @return matchedAs  the registered or attested name that produced the verdict ("" if none)
     * @return level  VerificationLevel of the payee (None / SelfClaimed / Attested)
     */
    function checkPayee(address payee, string calldata name)
        public
        view
        returns (MatchResult result, string memory matchedAs, VerificationLevel level)
    {
        bytes memory q = _normalize(name);
        if (q.length == 0) return (MatchResult.NotFound, "", VerificationLevel.None);
        if (q.length > MAX_NAME_LENGTH) revert NameTooLong();

        Payee storage p = _payees[payee];
        string[] storage alts = _attestedNames[payee];
        if (!p.registered && alts.length == 0) {
            return (MatchResult.NotFound, "", VerificationLevel.None);
        }

        level = p.level;
        result = MatchResult.NoMatch;

        // Candidate 1: self-claimed display name
        if (p.registered && bytes(p.displayName).length > 0) {
            uint256 d = _levenshtein(q, _normalize(p.displayName));
            if (d == 0) return (MatchResult.FullMatch, p.displayName, level);
            if (d <= _closeThreshold(_max(q.length, _normalize(p.displayName).length))) {
                result = MatchResult.CloseMatch;
                matchedAs = p.displayName;
            }
        }

        // Candidates 2..n: verifier-attested alternate names
        uint256 n = alts.length;
        for (uint256 i = 0; i < n; i++) {
            string memory alt = alts[i];
            bytes memory an = _normalize(alt);
            uint256 d = _levenshtein(q, an);
            if (d == 0) return (MatchResult.FullMatch, alt, level);
            if (d <= _closeThreshold(_max(q.length, an.length)) && result != MatchResult.CloseMatch) {
                result = MatchResult.CloseMatch;
                matchedAs = alt;
            }
        }

        return (result, matchedAs, level);
    }

    // ------------------------------------------------------------------
    // Views for the UI
    // ------------------------------------------------------------------

    /// @notice Full identity card for a payee.
    function payeeOf(address payee)
        external
        view
        returns (string memory displayName, uint64 registeredAt, uint8 level, uint256 attestations)
    {
        Payee storage p = _payees[payee];
        return (p.displayName, p.registeredAt, uint8(p.level), attestationCount[payee]);
    }

    function attestedNamesOf(address payee) external view returns (string[] memory) {
        return _attestedNames[payee];
    }

    // ------------------------------------------------------------------
    // Name normalization — ASCII, lowercase, strip punctuation, collapse spaces
    // ------------------------------------------------------------------

    function _normalize(string memory s) internal pure returns (bytes memory outB) {
        bytes memory b = bytes(s);
        outB = new bytes(b.length);
        uint256 outLen;
        bool lastWasSpace = true; // also trims leading whitespace
        for (uint256 i = 0; i < b.length; i++) {
            uint8 c = uint8(b[i]);
            if (c >= 65 && c <= 90) c += 32; // A-Z -> a-z
            bool keep = (c >= 97 && c <= 122) || (c >= 48 && c <= 57); // a-z 0-9
            if (keep) {
                outB[outLen++] = bytes1(c);
                lastWasSpace = false;
            } else if (c == 32 && !lastWasSpace) {
                outB[outLen++] = 0x20; // collapse runs of whitespace to single space
                lastWasSpace = true;
            }
            // everything else (punctuation, control, non-ASCII) is dropped
        }
        if (outLen > 0 && outB[outLen - 1] == 0x20) outLen--; // trim trailing space
        assembly {
            mstore(outB, outLen)
        }
    }

    // ------------------------------------------------------------------
    // Bounded Levenshtein distance — names are capped at 64 chars,
    // so worst-case cost is 64 * 64 = 4096 loop steps (a few hundred k gas).
    // ------------------------------------------------------------------

    function _levenshtein(bytes memory a, bytes memory b) internal pure returns (uint256) {
        uint256 m = a.length;
        uint256 n = b.length;
        if (m == 0) return n;
        if (n == 0) return m;

        uint256[] memory prev = new uint256[](n + 1);
        uint256[] memory curr = new uint256[](n + 1);
        for (uint256 j = 0; j <= n; j++) prev[j] = j;

        for (uint256 i = 1; i <= m; i++) {
            curr[0] = i;
            for (uint256 j = 1; j <= n; j++) {
                uint256 cost = a[i - 1] == b[j - 1] ? 0 : 1;
                uint256 del = prev[j] + 1;
                uint256 ins = curr[j - 1] + 1;
                uint256 sub = prev[j - 1] + cost;
                curr[j] = del < ins ? (del < sub ? del : sub) : (ins < sub ? ins : sub);
            }
            (prev, curr) = (curr, prev);
        }
        return prev[n];
    }

    /// @dev Close-match tolerance mirrors UK CoP behavior: short names must match
    ///      exactly, longer names tolerate typo-level distance.
    function _closeThreshold(uint256 L) internal pure returns (uint256) {
        if (L >= 24) return 3;
        if (L >= 12) return 2;
        if (L >= 5) return 1;
        return 0;
    }

    function _max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a : b;
    }
}
