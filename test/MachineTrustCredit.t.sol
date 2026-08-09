// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/MachineTrustRegistry.sol";
import "../contracts/MachineTrustCredit.sol";

contract MachineTrustCreditTest is Test {
    MachineTrustRegistry internal registry;
    MachineTrustCredit internal credit;
    address internal operator = address(0xA11CE);
    address internal borrower = address(0xB0B);
    address internal stranger = address(0xBAD);
    bytes32 internal machineId = keccak256("MT-TEST");
    bytes32 internal cviRef = keccak256("cvi:test");

    function setUp() public {
        registry = new MachineTrustRegistry(operator);
        credit = new MachineTrustCredit(address(registry), operator);

        vm.prank(operator);
        registry.registerMachine(machineId, keccak256("passport"), keccak256("asset"), borrower);
    }

    function test_open_reverts_without_cvi() public {
        vm.deal(operator, 1 ether);
        vm.prank(operator);
        vm.expectRevert(MachineTrustCredit.NotCviVerified.selector);
        credit.openCreditDeposit{value: 0.1 ether}(borrower, machineId, cviRef);
    }

    function test_open_reverts_for_non_owner() public {
        vm.prank(operator);
        credit.setCviEligible(stranger, true, cviRef);

        vm.deal(operator, 1 ether);
        vm.prank(operator);
        vm.expectRevert(MachineTrustCredit.NotMachineOwner.selector);
        credit.openCreditDeposit{value: 0.1 ether}(stranger, machineId, cviRef);
    }

    function test_open_succeeds_when_cvi_and_owner() public {
        vm.prank(operator);
        credit.setCviEligible(borrower, true, cviRef);

        vm.deal(operator, 1 ether);
        vm.prank(operator);
        credit.openCreditDeposit{value: 0.1 ether}(borrower, machineId, cviRef);

        (bytes32 mid, , uint256 deposit, , bool active) = credit.positions(borrower);
        assertTrue(active);
        assertEq(mid, machineId);
        assertEq(deposit, 0.1 ether);
        assertEq(credit.totalDeposits(), 0.1 ether);
        assertTrue(credit.isAuthorized(borrower, machineId));
    }

    function test_unverified_not_authorized() public view {
        assertFalse(credit.isAuthorized(borrower, machineId));
    }
}
