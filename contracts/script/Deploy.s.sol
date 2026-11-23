// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {PayeeRegistry} from "../src/PayeeRegistry.sol";
import {PaymentGuard} from "../src/PaymentGuard.sol";

/**
 * @notice Deploy PayeeRegistry + PaymentGuard to QDay Aevum Testnet (chain 44005).
 *
 * Usage:
 *   cast wallet address --private-key $PK          # find your address first
 *   export DEPLOYER_PRIVATE_KEY=0x...
 *   forge script script/Deploy.s.sol \
 *     --rpc-url https://rpc-test.qday.info \
 *     --broadcast --verify
 *
 * The deployer automatically becomes the registry's first verifier.
 */
contract Deploy is Script {
    function run() external returns (address registryAddr, address guardAddr) {
        // vm.envUint parses a 0x-prefixed hex string into a uint256 private key.
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console2.log("== PaySentry deployment ==");
        console2.log("Deployer:", deployer);
        console2.log("Chain ID:", block.chainid);

        vm.startBroadcast(deployerKey);

        PayeeRegistry registry = new PayeeRegistry();
        console2.log("PayeeRegistry:", address(registry));

        PaymentGuard guard = new PaymentGuard(address(registry));
        console2.log("PaymentGuard :", address(guard));

        vm.stopBroadcast();

        registryAddr = address(registry);
        guardAddr = address(guard);

        // Persist for the frontend: deployments/<chainId>.json
        string memory json = "deployment";
        vm.serializeUint(json, "chainId", block.chainid);
        vm.serializeAddress(json, "deployer", deployer);
        vm.serializeAddress(json, "registry", registryAddr);
        string memory out = vm.serializeAddress(json, "guard", guardAddr);
        vm.writeJson(out, string.concat("deployments/", vm.toString(block.chainid), ".json"));

        console2.log("Saved deployments/", vm.toString(block.chainid), ".json");
        console2.log("Deployer is the registry's first verifier.");
    }
}
