import { deployScript, artifacts } from "../rocketh/deploy.js";

/**
 * Deploys a contract named "PolicyGuard" using the deployer account and a
 * constructor argument that sets the per-action spend cap to 1 ether.
 *
 * @param env Rocketh environment object.
 */
export default deployScript(
  async env => {
    /*
      On localhost, the deployer account is the one that comes with Hardhat, which is already funded.

      When deploying to live networks (e.g `yarn deploy --network sepolia`), the deployer account
      should have sufficient balance to pay for the gas fees for contract creation.

      You can generate a random account with `yarn generate` or `yarn account:import` to import your
      existing PK which will fill DEPLOYER_PRIVATE_KEY_ENCRYPTED in the .env file (then used on hardhat.config.ts)
      You can run the `yarn account` command to check your balance in every network.
    */
    const { deployer } = env.namedAccounts;

    const policyGuard = await env.deploy("PolicyGuard", {
      account: deployer,
      artifact: artifacts.PolicyGuard,
      // Constructor: spend cap in wei (1 ether)
      args: [1000000000000000000n],
    });

    // Read back from the deployed contract
    const spendCap = await env.read(policyGuard, { functionName: "spendCap" });
    console.log("🛡️ Spend cap (wei):", spendCap);
  },
  {
    // Tags are useful if you have multiple deploy files and only want to run some of them.
    // e.g. yarn deploy --tags PolicyGuard
    tags: ["PolicyGuard"],
  },
);
