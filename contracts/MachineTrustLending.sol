// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MachineTrustLending
 * @notice CVI-gated machine finance pool for Cleanverse Track 2 (Compliant DeFi).
 *
 * Architecture (docs-honest):
 * - Cleanverse A-Pass / verify_apass run OFF-CHAIN (API secrets never on-chain).
 * - A compliance oracle (backend operator) sets `eligible[borrower] = true`
 *   only after Cleanverse returns an active A-Pass and verify_apass data.code == 4.
 * - Loan creation, borrow, and repay execute ON-CHAIN against pool liquidity.
 *
 * This contract does NOT claim the physical machine is locked as collateral.
 * Machine Passport context stays off-chain; eligibility is identity-based.
 */
contract MachineTrustLending {
    address public owner;
    address public complianceOracle;

    uint256 public totalLiquidity;
    uint256 public totalBorrowed;
    uint256 public interestBps; // e.g. 800 = 8.00%
    uint256 public defaultDuration; // seconds

    enum LoanStatus {
        None,
        Requested,
        Active,
        Repaid,
        Defaulted
    }

    struct Loan {
        address borrower;
        uint256 principal;
        uint256 interestDue;
        uint256 createdAt;
        uint256 dueAt;
        LoanStatus status;
        bytes32 passportRef; // off-chain Machine Passport reference (not collateral lock)
    }

    mapping(address => bool) public eligible;
    mapping(uint256 => Loan) public loans;
    uint256 public nextLoanId;

    event EligibilitySet(address indexed borrower, bool eligible, bytes32 complianceRef);
    event Supplied(address indexed lender, uint256 amount);
    event LoanRequested(uint256 indexed loanId, address indexed borrower, uint256 principal);
    event LoanActivated(uint256 indexed loanId, address indexed borrower, uint256 principal);
    event LoanRepaid(uint256 indexed loanId, address indexed borrower, uint256 amount);
    event ParametersUpdated(uint256 interestBps, uint256 defaultDuration);

    error NotOwner();
    error NotOracle();
    error NotEligible();
    error InsufficientLiquidity();
    error InvalidAmount();
    error BadLoanState();
    error NotBorrower();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyOracle() {
        if (msg.sender != complianceOracle) revert NotOracle();
        _;
    }

    constructor(address oracle_, uint256 interestBps_, uint256 defaultDuration_) {
        owner = msg.sender;
        complianceOracle = oracle_;
        interestBps = interestBps_;
        defaultDuration = defaultDuration_;
    }

    function setComplianceOracle(address oracle_) external onlyOwner {
        complianceOracle = oracle_;
    }

    function setParameters(uint256 interestBps_, uint256 defaultDuration_) external onlyOwner {
        interestBps = interestBps_;
        defaultDuration = defaultDuration_;
        emit ParametersUpdated(interestBps_, defaultDuration_);
    }

    /**
     * @notice Backend calls this after Cleanverse CVI + CCP succeed.
     * @param complianceRef Hash of off-chain Cleanverse decision (not a fake oracle feed).
     */
    function setBorrowerEligible(
        address borrower,
        bool isEligible,
        bytes32 complianceRef
    ) external onlyOracle {
        eligible[borrower] = isEligible;
        emit EligibilitySet(borrower, isEligible, complianceRef);
    }

    function supply() external payable {
        if (msg.value == 0) revert InvalidAmount();
        totalLiquidity += msg.value;
        emit Supplied(msg.sender, msg.value);
    }

    function availableLiquidity() public view returns (uint256) {
        return totalLiquidity - totalBorrowed;
    }

    function requestLoan(
        uint256 principal,
        bytes32 passportRef
    ) external returns (uint256 loanId) {
        if (!eligible[msg.sender]) revert NotEligible();
        if (principal == 0) revert InvalidAmount();
        if (principal > availableLiquidity()) revert InsufficientLiquidity();

        loanId = nextLoanId++;
        uint256 interestDue = (principal * interestBps) / 10_000;
        loans[loanId] = Loan({
            borrower: msg.sender,
            principal: principal,
            interestDue: interestDue,
            createdAt: block.timestamp,
            dueAt: block.timestamp + defaultDuration,
            status: LoanStatus.Requested,
            passportRef: passportRef
        });
        emit LoanRequested(loanId, msg.sender, principal);
    }

    function activateLoan(uint256 loanId) external returns (uint256) {
        Loan storage loan = loans[loanId];
        if (loan.status != LoanStatus.Requested) revert BadLoanState();
        if (msg.sender != loan.borrower) revert NotBorrower();
        if (!eligible[msg.sender]) revert NotEligible();
        if (loan.principal > availableLiquidity()) revert InsufficientLiquidity();

        loan.status = LoanStatus.Active;
        totalBorrowed += loan.principal;
        (bool ok, ) = payable(loan.borrower).call{value: loan.principal}("");
        require(ok, "transfer failed");
        emit LoanActivated(loanId, loan.borrower, loan.principal);
        return loanId;
    }

    function repay(uint256 loanId) external payable {
        Loan storage loan = loans[loanId];
        if (loan.status != LoanStatus.Active) revert BadLoanState();
        if (msg.sender != loan.borrower) revert NotBorrower();
        uint256 due = loan.principal + loan.interestDue;
        if (msg.value < due) revert InvalidAmount();

        loan.status = LoanStatus.Repaid;
        totalBorrowed -= loan.principal;
        totalLiquidity += loan.interestDue;
        // excess refund
        uint256 excess = msg.value - due;
        if (excess > 0) {
            (bool ok, ) = payable(msg.sender).call{value: excess}("");
            require(ok, "refund failed");
        }
        emit LoanRepaid(loanId, loan.borrower, due);
    }

    function getLoan(uint256 loanId) external view returns (Loan memory) {
        return loans[loanId];
    }
}
