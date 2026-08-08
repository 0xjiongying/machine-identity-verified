// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * MachineTrustRegistry — minimal on-chain proof of machine registration + ownership.
 *
 * Cleanverse owns CVI / CVA / CCP decisions off-chain.
 * This contract does NOT implement KYC, AML, A-Pass, or compliance.
 * Callers (Machine Trust backend / authorized operator) MUST only write
 * after a Cleanverse CCP approval (verify_apass data.code === 4).
 *
 * Deployment status: NOT DEPLOYED in this hackathon build.
 * Ship to Monad Testnet first; only claim Mainnet when the tx is explorer-verifiable.
 */
contract MachineTrustRegistry {
    struct Machine {
        bytes32 passportHash;
        bytes32 cleanverseAssetRef;
        address owner;
        uint64 registeredAt;
        bool exists;
    }

    address public operator;
    mapping(bytes32 => Machine) public machines;
    mapping(bytes32 => address) public previousOwner;

    event MachineRegistered(
        bytes32 indexed machineId,
        bytes32 passportHash,
        bytes32 cleanverseAssetRef,
        address indexed owner
    );
    event OwnershipTransferred(
        bytes32 indexed machineId,
        address indexed from,
        address indexed to,
        bytes32 cleanverseDecisionRef
    );

    error NotOperator();
    error AlreadyRegistered();
    error UnknownMachine();
    error ZeroAddress();

    modifier onlyOperator() {
        if (msg.sender != operator) revert NotOperator();
        _;
    }

    constructor(address operator_) {
        if (operator_ == address(0)) revert ZeroAddress();
        operator = operator_;
    }

    function setOperator(address next) external onlyOperator {
        if (next == address(0)) revert ZeroAddress();
        operator = next;
    }

    /**
     * Register a machine after successful issuance CCP.
     * `cleanverseAssetRef` should commit to the bound A-Token / passport binding
     * (e.g. keccak256 of atoken address + passport id) — not a fabricated mint.
     */
    function registerMachine(
        bytes32 machineId,
        bytes32 passportHash,
        bytes32 cleanverseAssetRef,
        address owner_
    ) external onlyOperator {
        if (owner_ == address(0)) revert ZeroAddress();
        if (machines[machineId].exists) revert AlreadyRegistered();
        machines[machineId] = Machine({
            passportHash: passportHash,
            cleanverseAssetRef: cleanverseAssetRef,
            owner: owner_,
            registeredAt: uint64(block.timestamp),
            exists: true
        });
        emit MachineRegistered(machineId, passportHash, cleanverseAssetRef, owner_);
    }

    /**
     * Transfer ownership only after transfer CCP approval.
     * `cleanverseDecisionRef` is an off-chain commitment to the verify_apass decision
     * (never a substitute for Cleanverse compliance).
     */
    function transferOwnership(
        bytes32 machineId,
        address to,
        bytes32 cleanverseDecisionRef
    ) external onlyOperator {
        if (to == address(0)) revert ZeroAddress();
        Machine storage m = machines[machineId];
        if (!m.exists) revert UnknownMachine();
        address from = m.owner;
        previousOwner[machineId] = from;
        m.owner = to;
        emit OwnershipTransferred(machineId, from, to, cleanverseDecisionRef);
    }

    function ownerOf(bytes32 machineId) external view returns (address) {
        if (!machines[machineId].exists) revert UnknownMachine();
        return machines[machineId].owner;
    }
}
