// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/MachineTrustRegistry.sol";

contract MachineTrustRegistryTest is Test {
    MachineTrustRegistry internal registry;
    address internal operator = address(0xA11CE);
    address internal issuer = address(0xB0B);
    address internal fund = address(0xC0FFEE);

    bytes32 internal machineId = keccak256("MT-000042");
    bytes32 internal passportHash = keccak256("passport:MT-000042");
    bytes32 internal assetRef = keccak256("cva:atoken/ausdc");
    bytes32 internal decisionRef = keccak256("ccp:decision/approved");

    function setUp() public {
        registry = new MachineTrustRegistry(operator);
    }

    function test_constructor_sets_operator() public view {
        assertEq(registry.operator(), operator);
    }

    function test_registerMachine_emits_and_sets_owner() public {
        vm.prank(operator);
        vm.expectEmit(true, true, false, true);
        emit MachineTrustRegistry.MachineRegistered(machineId, passportHash, assetRef, issuer);
        registry.registerMachine(machineId, passportHash, assetRef, issuer);
        assertEq(registry.ownerOf(machineId), issuer);
    }

    function test_registerMachine_reverts_for_non_operator() public {
        vm.prank(issuer);
        vm.expectRevert(MachineTrustRegistry.NotOperator.selector);
        registry.registerMachine(machineId, passportHash, assetRef, issuer);
    }

    function test_registerMachine_reverts_zero_owner() public {
        vm.prank(operator);
        vm.expectRevert(MachineTrustRegistry.ZeroAddress.selector);
        registry.registerMachine(machineId, passportHash, assetRef, address(0));
    }

    function test_registerMachine_reverts_duplicate() public {
        vm.startPrank(operator);
        registry.registerMachine(machineId, passportHash, assetRef, issuer);
        vm.expectRevert(MachineTrustRegistry.AlreadyRegistered.selector);
        registry.registerMachine(machineId, passportHash, assetRef, issuer);
        vm.stopPrank();
    }

    function test_transferOwnership_after_register() public {
        vm.startPrank(operator);
        registry.registerMachine(machineId, passportHash, assetRef, issuer);
        vm.expectEmit(true, true, true, true);
        emit MachineTrustRegistry.OwnershipTransferred(machineId, issuer, fund, decisionRef);
        registry.transferOwnership(machineId, fund, decisionRef);
        vm.stopPrank();
        assertEq(registry.ownerOf(machineId), fund);
        assertEq(registry.previousOwner(machineId), issuer);
    }

    function test_transferOwnership_reverts_unknown_machine() public {
        vm.prank(operator);
        vm.expectRevert(MachineTrustRegistry.UnknownMachine.selector);
        registry.transferOwnership(machineId, fund, decisionRef);
    }

    function test_transferOwnership_reverts_zero_to() public {
        vm.startPrank(operator);
        registry.registerMachine(machineId, passportHash, assetRef, issuer);
        vm.expectRevert(MachineTrustRegistry.ZeroAddress.selector);
        registry.transferOwnership(machineId, address(0), decisionRef);
        vm.stopPrank();
    }

    function test_ownerOf_reverts_unknown() public {
        vm.expectRevert(MachineTrustRegistry.UnknownMachine.selector);
        registry.ownerOf(machineId);
    }
}
