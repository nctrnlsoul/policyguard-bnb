/**
 * agentLoop.ts — the PolicyGuard agent loop (BSC testnet)
 *
 * What it does:
 *   1. The operator configures policy once (allow-list a vendor address).
 *   2. The "agent" proposes a batch of actions.
 *   3. For each action it calls check() on-chain, and only calls execute()
 *      if the verdict is clean. Non-compliant actions are caught by check
 *      and never broadcast.
 *
 * This is the deterministic v1: proposals are a hardcoded list. The "AI"
 * layer (an LLM turning natural language into a proposed action) is a thin
 * swap on top of this once the mechanism is proven.
 *
 * Runs against BSC testnet via the dRPC endpoint. The operator wallet is the
 * encrypted deployer keystore (the contract owner), decrypted at startup the
 * same way `yarn deploy` does. Set DEPLOYER_PASSWORD to skip the prompt.
 *   npx tsx packages/hardhat/scripts/agentLoop.ts
 */

import "dotenv/config";
import { createPublicClient, createWalletClient, http, parseEther, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bscTestnet } from "viem/chains";
import { Wallet } from "ethers";
import password from "@inquirer/password";

// ---------------------------------------------------------------------------
// CONFIG (BSC testnet)
// ---------------------------------------------------------------------------
if (
  !process.env.BSC_TESTNET_RPC_URL ||
  !process.env.POLICY_GUARD_ADDRESS ||
  !process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED
) {
  console.error(
    "Missing env vars: set BSC_TESTNET_RPC_URL, POLICY_GUARD_ADDRESS, and DEPLOYER_PRIVATE_KEY_ENCRYPTED (see packages/hardhat/.env)",
  );
  process.exit(1);
}

const RPC = process.env.BSC_TESTNET_RPC_URL;

// PolicyGuard address on BSC testnet (from .env).
const POLICY_GUARD = process.env.POLICY_GUARD_ADDRESS as `0x${string}`;

// Demo targets
const VENDOR = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as const; // will be allow-listed
const UNKNOWN = "0x000000000000000000000000000000000000dEaD" as const; // never allow-listed

// ---------------------------------------------------------------------------
// ABI (only what the loop uses)
// ---------------------------------------------------------------------------
const ABI = [
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "spendCap",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "paused",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "allowed",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "setAllowed",
    stateMutability: "nonpayable",
    inputs: [
      { name: "target", type: "address" },
      { name: "ok", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "check",
    stateMutability: "view",
    inputs: [
      { name: "target", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [
      { name: "ok", type: "bool" },
      { name: "reason", type: "string" },
    ],
  },
  {
    type: "function",
    name: "execute",
    stateMutability: "payable",
    inputs: [
      { name: "target", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
    outputs: [{ type: "bytes" }],
  },
] as const;

// ---------------------------------------------------------------------------
// The agent's proposed actions for this run
// ---------------------------------------------------------------------------
type Proposal = { label: string; target: `0x${string}`; value: bigint; data: `0x${string}` };

const proposals: Proposal[] = [
  { label: "Pay 0.02 BNB to approved vendor", target: VENDOR, value: parseEther("0.02"), data: "0x" },
  { label: "Pay 2 BNB to approved vendor (over cap)", target: VENDOR, value: parseEther("2"), data: "0x" },
  { label: "Pay 0.1 BNB to an unknown address", target: UNKNOWN, value: parseEther("0.1"), data: "0x" },
];

// ---------------------------------------------------------------------------
async function main() {
  // Decrypt the deployer keystore (the contract owner) to operate the loop.
  const pass =
    process.env.DEPLOYER_PASSWORD ?? (await password({ message: "Enter password to decrypt deployer key:" }));
  const wallet = await Wallet.fromEncryptedJson(process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED as string, pass);
  const account = privateKeyToAccount(wallet.privateKey as `0x${string}`);

  const publicClient = createPublicClient({ chain: bscTestnet, transport: http(RPC) });
  const walletClient = createWalletClient({ account, chain: bscTestnet, transport: http(RPC) });

  const read = <T extends string>(functionName: T, args: readonly unknown[] = []) =>
    publicClient.readContract({
      address: POLICY_GUARD,
      abi: ABI,
      functionName: functionName as any,
      args: args as any,
    });

  // --- header / sanity ---
  const owner = (await read("owner")) as `0x${string}`;
  const cap = (await read("spendCap")) as bigint;
  const paused = (await read("paused")) as boolean;

  console.log("PolicyGuard:", POLICY_GUARD);
  console.log("Operator   :", account.address);
  console.log("Owner      :", owner);
  console.log("Spend cap  :", formatEther(cap), "BNB");
  console.log("Paused     :", paused);
  console.log("-".repeat(64));

  if (account.address.toLowerCase() !== owner.toLowerCase()) {
    console.error("STOP: operator is not the contract owner. Owner-gated calls would revert.");
    return;
  }
  if (paused) {
    console.error("STOP: contract is paused. Unpause before running the loop.");
    return;
  }

  // --- operator configures policy: allow-list the vendor ---
  const alreadyAllowed = (await read("allowed", [VENDOR])) as boolean;
  if (!alreadyAllowed) {
    const hash = await walletClient.writeContract({
      address: POLICY_GUARD,
      abi: ABI,
      functionName: "setAllowed",
      args: [VENDOR, true],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`policy set | allow-listed vendor ${VENDOR}`);
  } else {
    console.log(`policy ok  | vendor ${VENDOR} already allow-listed`);
  }
  console.log("-".repeat(64));

  const vendorBefore = await publicClient.getBalance({ address: VENDOR });

  // --- the agent loop: propose -> check -> execute only if compliant ---
  for (const p of proposals) {
    const [ok, reason] = (await read("check", [p.target, p.value])) as [boolean, string];

    if (!ok) {
      console.log(`DENIED   | ${p.label}  ->  ${reason}  (never broadcast)`);
      continue;
    }

    const hash = await walletClient.writeContract({
      address: POLICY_GUARD,
      abi: ABI,
      functionName: "execute",
      args: [p.target, p.value, p.data],
      value: p.value,
    });
    const rcpt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`EXECUTED | ${p.label}  ->  ${rcpt.status}  tx ${hash}`);
  }

  console.log("-".repeat(64));
  const vendorAfter = await publicClient.getBalance({ address: VENDOR });
  console.log("Vendor balance moved:", formatEther(vendorAfter - vendorBefore), "BNB (expect 0.02)");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
