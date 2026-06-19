// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PolicyGuard
 * @notice On-chain guardrail for an autonomous agent. Every action the agent
 *         takes must route through `execute`, which enforces three policies
 *         on-chain so they cannot be bypassed off-chain:
 *           1. Allow-list — the target address must be explicitly permitted
 *           2. Spend cap  — the native value of a single action is bounded
 *           3. Pause      — the operator can halt all actions instantly
 * @dev    The agent (operator) is the owner. It pre-flights any action with the
 *         `check` view, then calls `execute` to perform it. The contract is the
 *         enforcement point, not the agent.
 */
contract PolicyGuard {
    address public owner;
    bool public paused;
    uint256 public spendCap;                  // max native value (wei) per action
    mapping(address => bool) public allowed;  // permitted target addresses

    uint256 private _lock = 1;                 // minimal reentrancy guard

    event OwnerUpdated(address indexed newOwner);
    event PausedSet(bool paused);
    event SpendCapSet(uint256 cap);
    event TargetSet(address indexed target, bool allowed);
    event Executed(address indexed target, uint256 value, bytes data);

    error NotOwner();
    error Reentrant();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier nonReentrant() {
        if (_lock != 1) revert Reentrant();
        _lock = 2;
        _;
        _lock = 1;
    }

    constructor(uint256 _spendCap) {
        owner = msg.sender;
        spendCap = _spendCap;
        emit OwnerUpdated(msg.sender);
        emit SpendCapSet(_spendCap);
    }

    // --- policy administration (operator only) ---

    function setAllowed(address target, bool ok) external onlyOwner {
        allowed[target] = ok;
        emit TargetSet(target, ok);
    }

    function setSpendCap(uint256 cap) external onlyOwner {
        spendCap = cap;
        emit SpendCapSet(cap);
    }

    function setPaused(bool p) external onlyOwner {
        paused = p;
        emit PausedSet(p);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
        emit OwnerUpdated(newOwner);
    }

    // --- policy decision (read-only pre-flight for the agent loop) ---

    /**
     * @notice Returns the policy verdict for a proposed action without doing it.
     * @return ok      true if the action would be permitted right now
     * @return reason  human-readable explanation (empty string when ok)
     */
    function check(address target, uint256 value)
        external
        view
        returns (bool ok, string memory reason)
    {
        if (paused) return (false, "paused");
        if (!allowed[target]) return (false, "target not on allow-list");
        if (value > spendCap) return (false, "exceeds spend cap");
        return (true, "");
    }

    // --- enforced execution (the only way the agent acts) ---

    /**
     * @notice Executes a proposed action only if it passes every policy.
     *         The caller forwards the native value with the call (msg.value).
     * @dev    Reverts identify which policy blocked the action, so a denied
     *         attempt is still a legible on-chain event.
     */
    function execute(address target, uint256 value, bytes calldata data)
        external
        payable
        onlyOwner
        nonReentrant
        returns (bytes memory result)
    {
        require(!paused, "paused");
        require(allowed[target], "target not on allow-list");
        require(value <= spendCap, "exceeds spend cap");
        require(msg.value == value, "value mismatch");

        (bool success, bytes memory ret) = target.call{value: value}(data);
        require(success, "target call failed");

        emit Executed(target, value, data);
        return ret;
    }

    // accept native funding if you later prefer a treasury model over msg.value forwarding
    receive() external payable {}
}
