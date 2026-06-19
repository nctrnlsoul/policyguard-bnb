/**
 * One-off: unpause PolicyGuard from the operator (owner) account on the local chain.
 *   npx tsx packages/hardhat/scripts/unpausePolicyGuard.ts
 */
import "dotenv/config";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";

if (!process.env.LOCAL_DEPLOYER_PK || !process.env.POLICY_GUARD_ADDRESS) {
  console.error("Missing env vars: set LOCAL_DEPLOYER_PK and POLICY_GUARD_ADDRESS (see packages/hardhat/.env)");
  process.exit(1);
}

const RPC = "http://127.0.0.1:8545";
const POLICY_GUARD = process.env.POLICY_GUARD_ADDRESS as `0x${string}`;
const OWNER_PK = process.env.LOCAL_DEPLOYER_PK as `0x${string}`;

const ABI = [
  { type: "function", name: "paused", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  {
    type: "function",
    name: "setPaused",
    stateMutability: "nonpayable",
    inputs: [{ name: "p", type: "bool" }],
    outputs: [],
  },
] as const;

async function main() {
  const account = privateKeyToAccount(OWNER_PK);
  const publicClient = createPublicClient({ chain: hardhat, transport: http(RPC) });
  const walletClient = createWalletClient({ account, chain: hardhat, transport: http(RPC) });

  const before = (await publicClient.readContract({
    address: POLICY_GUARD,
    abi: ABI,
    functionName: "paused",
  })) as boolean;
  console.log("paused (before):", before);

  if (!before) {
    console.log("already unpaused, nothing to do");
    return;
  }

  const hash = await walletClient.writeContract({
    address: POLICY_GUARD,
    abi: ABI,
    functionName: "setPaused",
    args: [false],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  console.log("setPaused(false) tx:", hash);

  const after = (await publicClient.readContract({
    address: POLICY_GUARD,
    abi: ABI,
    functionName: "paused",
  })) as boolean;
  console.log("paused (after):", after);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
