/**
 * One-off: unpause PolicyGuard from the operator (owner) account on the local chain.
 *   npx tsx packages/hardhat/scripts/unpausePolicyGuard.ts
 */
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";

const RPC = "http://127.0.0.1:8545";
const POLICY_GUARD = "0x5fbdb2315678afecb367f032d93f642f64180aa3" as const;
const OWNER_PK = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;

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
