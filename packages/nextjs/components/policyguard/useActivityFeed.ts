"use client";

import { useQuery } from "@tanstack/react-query";
import { type Abi, parseEventLogs } from "viem";
import { usePublicClient } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";

// PolicyGuard ABI (BSC testnet, chain 97), used to decode events out of receipts.
const policyGuard = deployedContracts[97].PolicyGuard;
const POLICY_GUARD_ABI = policyGuard.abi as Abi;
const POLICY_GUARD_ADDRESS = policyGuard.address.toLowerCase();

// Known on-chain PolicyGuard transactions on BSC testnet.
//
// Why receipts and not eth_getLogs: the contract's only activity is ~700k
// blocks behind the chain head, and historical eth_getLogs is unavailable on
// every keyless BSC-testnet RPC. publicnode rejects it ("Archive requests
// require a personal token"), the bnbchain seed nodes reject it ("limit
// exceeded") even for a single 500-block window, and BscScan's logs API is
// paid-only for chain 97. Transaction receipts, by contrast, are served
// keylessly for any block, so we read the real emitted events straight from
// these receipts. A keyed archive RPC or an indexer would be needed to scan
// the full range generically; that is out of scope for a keyless client.
const KNOWN_TXS = [
  "0xd3aafe1839df81577cf668076a0acb31163e0d219f2f1c8be63dd2964741bb19", // deploy: constructor emits SpendCapSet (initial policy)
  "0xc5387926de110f8922f04326c41015df67051bc053b116523070d41ec4b38e09", // execute: emits Executed (the compliant payment)
] as const;

export type ActivityEvent = {
  eventName: string;
  args: Record<string, unknown>;
  blockNumber: bigint;
  logIndex: number;
  transactionHash: string;
  timestamp?: bigint;
};

export const useActivityFeed = () => {
  const { targetNetwork } = useTargetNetwork();
  const publicClient = usePublicClient({ chainId: targetNetwork.id });

  const { data, isLoading } = useQuery({
    queryKey: ["policyguard-activity", targetNetwork.id, KNOWN_TXS],
    enabled: Boolean(publicClient),
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<ActivityEvent[]> => {
      if (!publicClient) return [];

      const receipts = await Promise.all(KNOWN_TXS.map(hash => publicClient.getTransactionReceipt({ hash })));

      const events: ActivityEvent[] = receipts.flatMap(receipt => {
        const logs = receipt.logs.filter(log => log.address.toLowerCase() === POLICY_GUARD_ADDRESS);
        const parsed = parseEventLogs({ abi: POLICY_GUARD_ABI, logs });
        return parsed.map(p => ({
          eventName: p.eventName,
          args: p.args as Record<string, unknown>,
          blockNumber: p.blockNumber,
          logIndex: p.logIndex,
          transactionHash: p.transactionHash,
        }));
      });

      // Attach block timestamps (one getBlock per unique block, keyless).
      const uniqueBlocks = [...new Set(events.map(e => e.blockNumber))];
      const blocks = await Promise.all(uniqueBlocks.map(blockNumber => publicClient.getBlock({ blockNumber })));
      const tsByBlock = new Map(blocks.map(b => [b.number, b.timestamp]));

      return events.map(e => ({ ...e, timestamp: tsByBlock.get(e.blockNumber) }));
    },
  });

  return { events: data ?? [], isLoading };
};
