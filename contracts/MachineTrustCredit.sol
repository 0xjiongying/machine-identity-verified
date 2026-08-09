// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MachineTrustCredit
 * @notice CVI-gated credit deposit for Cleanverse Track 2 (Compliant DeFi).
 *
 * Core proof:
 *   Cleanverse CVI (off-chain query_apass)
 *     → oracle marks wallet CVI-eligible
 *     → MachineTrustRegistry.ownerOf(machineId) == borrower
 *     → openCreditDeposit() records a real Monad Testnet position
 *
 * Cleanverse secrets and KYC/PII never touch the chain.
 * CCP / CVA are Track 1 concerns and are NOT required by this contract.
 */
interface IMachineTrustRegistry {
    function ownerOf(bytes32 machineId) external view returns (address);
}

contract MachineTrustCredit {
    IMachineTrustRegistry public immutable registry;
    address public oracle;

    struct Position {
        bytes32 machineId;
        bytes32 cviRef;
        uint256 deposit;
        uint64 openedAt;
        bool active;
    }

    mapping(address => bool) public cviEligible;
    mapping(address => bytes32) public cviRefOf;
    mapping(address => Position) public positions;
    uint256 public totalDeposits;

    event CviEligibilitySet(address indexed wallet, bool eligible, bytes32 cviRef);
    event CreditOpened(
        address indexed borrower,
        bytes32 indexed machineId,
        uint256 amount,
        bytes32 cviRef
    );
    event CreditClosed(address indexed borrower, bytes32 indexed machineId, uint256 amount);
    event OracleUpdated(address indexed oracle);

    error NotOracle();
    error NotCviVerified();
    error NotMachineOwner();
    error InvalidAmount();
    error AlreadyOpen();
    error NoPosition();
    error ZeroAddress();

    modifier onlyOracle() {
        if (msg.sender != oracle) revert NotOracle();
        _;
    }

    constructor(address registry_, address oracle_) {
        if (registry_ == address(0) || oracle_ == address(0)) revert ZeroAddress();
        registry = IMachineTrustRegistry(registry_);
        oracle = oracle_;
    }

    function setOracle(address next) external onlyOracle {
        if (next == address(0)) revert ZeroAddress();
        oracle = next;
        emit OracleUpdated(next);
    }

    /**
     * @notice Backend oracle call AFTER live Cleanverse CVI (query_apass) succeeds.
     * @param cviRef Off-chain commitment to the Cleanverse A-Pass decision (not PII).
     */
    function setCviEligible(address wallet, bool eligible, bytes32 cviRef) external onlyOracle {
        if (wallet == address(0)) revert ZeroAddress();
        cviEligible[wallet] = eligible;
        cviRefOf[wallet] = cviRef;
        emit CviEligibilitySet(wallet, eligible, cviRef);
    }

    /**
     * @notice Open a credit deposit for a CVI-verified machine owner.
     *         Callable only by the oracle so the DeFi write cannot bypass off-chain CVI.
     *         Still enforces on-chain: cviEligible + registry.ownerOf.
     */
    function openCreditDeposit(
        address borrower,
        bytes32 machineId,
        bytes32 cviRef
    ) external payable onlyOracle returns (uint256) {
        if (borrower == address(0)) revert ZeroAddress();
        if (msg.value == 0) revert InvalidAmount();
        if (!cviEligible[borrower]) revert NotCviVerified();
        if (registry.ownerOf(machineId) != borrower) revert NotMachineOwner();
        if (positions[borrower].active) revert AlreadyOpen();

        positions[borrower] = Position({
            machineId: machineId,
            cviRef: cviRef,
            deposit: msg.value,
            openedAt: uint64(block.timestamp),
            active: true
        });
        totalDeposits += msg.value;
        emit CreditOpened(borrower, machineId, msg.value, cviRef);
        return msg.value;
    }

    function closeCreditDeposit(address borrower) external onlyOracle returns (uint256 amount) {
        Position storage p = positions[borrower];
        if (!p.active) revert NoPosition();
        amount = p.deposit;
        bytes32 machineId = p.machineId;
        p.active = false;
        p.deposit = 0;
        totalDeposits -= amount;
        (bool ok, ) = payable(borrower).call{value: amount}("");
        require(ok, "refund failed");
        emit CreditClosed(borrower, machineId, amount);
    }

    function isAuthorized(address wallet, bytes32 machineId) external view returns (bool) {
        if (!cviEligible[wallet]) return false;
        try registry.ownerOf(machineId) returns (address owner) {
            return owner == wallet;
        } catch {
            return false;
        }
    }
}
