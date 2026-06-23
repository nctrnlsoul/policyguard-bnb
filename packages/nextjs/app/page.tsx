"use client";

import { useMemo, useState } from "react";
import type { NextPage } from "next";
import { formatEther, isAddress, parseEther } from "viem";
import { useAccount } from "wagmi";
import { ActivityFeed, type FeedRow } from "~~/components/policyguard/ActivityFeed";
import { ProposeBar } from "~~/components/policyguard/ProposeBar";
import { TopBar } from "~~/components/policyguard/TopBar";
import { type Verdict, VerdictCard } from "~~/components/policyguard/VerdictCard";
import type { ChipState } from "~~/components/policyguard/theme";
import { useScaffoldEventHistory, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

// Block PolicyGuard was deployed on (chain 97). Bounds event history so we
// don't ask the RPC to scan from genesis.
const DEPLOY_BLOCK = 114589336n;
const DEAD = "0x000000000000000000000000000000000000dEaD";

const fmtAmount = (wei: bigint) => {
  const s = formatEther(wei);
  const n = Number(s);
  return Number.isInteger(n) ? n.toFixed(1) : s;
};

const shortHash = (h?: string) => (h ? `${h.slice(0, 6)}…${h.slice(-4)}` : "");

const timeAgo = (ts?: bigint) => {
  if (!ts) return "pending";
  const secs = Math.floor(Date.now() / 1000) - Number(ts);
  if (secs < 60) return "just now";
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.floor(h / 24)} d ago`;
};

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const { targetNetwork } = useTargetNetwork();

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("0.02");
  const [proposed, setProposed] = useState<{ target: string; value: bigint } | null>(null);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string>();
  const [executed, setExecuted] = useState(false);

  // --- live policy state ---
  const { data: paused } = useScaffoldReadContract({ contractName: "PolicyGuard", functionName: "paused" });
  const { data: spendCap } = useScaffoldReadContract({ contractName: "PolicyGuard", functionName: "spendCap" });
  const { data: owner } = useScaffoldReadContract({ contractName: "PolicyGuard", functionName: "owner" });

  // --- per-proposal reads (auto-disabled until a proposal exists) ---
  const { data: allowedTarget } = useScaffoldReadContract({
    contractName: "PolicyGuard",
    functionName: "allowed",
    args: [proposed?.target],
  });
  const { data: checkResult, isLoading: checkLoading } = useScaffoldReadContract({
    contractName: "PolicyGuard",
    functionName: "check",
    args: [proposed?.target, proposed?.value],
  });

  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "PolicyGuard" });

  // --- on-chain activity ---
  const executedEv = useScaffoldEventHistory({
    contractName: "PolicyGuard",
    eventName: "Executed",
    fromBlock: DEPLOY_BLOCK,
    watch: true,
    blockData: true,
  });
  const targetEv = useScaffoldEventHistory({
    contractName: "PolicyGuard",
    eventName: "TargetSet",
    fromBlock: DEPLOY_BLOCK,
    watch: true,
    blockData: true,
  });
  const pausedEv = useScaffoldEventHistory({
    contractName: "PolicyGuard",
    eventName: "PausedSet",
    fromBlock: DEPLOY_BLOCK,
    watch: true,
    blockData: true,
  });
  const capEv = useScaffoldEventHistory({
    contractName: "PolicyGuard",
    eventName: "SpendCapSet",
    fromBlock: DEPLOY_BLOCK,
    watch: true,
    blockData: true,
  });

  const isOwner = !!connectedAddress && !!owner && connectedAddress.toLowerCase() === owner.toLowerCase();
  const evaluating = !!proposed && checkLoading;

  // --- verdict + chips ---
  const verdict: Verdict = useMemo(() => {
    if (!proposed || !checkResult) return "idle";
    return checkResult[0] ? "approved" : "blocked";
  }, [proposed, checkResult]);

  const reason = proposed && checkResult && !checkResult[0] ? humanReason(checkResult[1]) : "";

  const chips: { allowlist: ChipState; spendcap: ChipState; pause: ChipState } = {
    pause: !proposed ? "idle" : paused ? "fail" : "ok",
    allowlist: !proposed || allowedTarget === undefined ? "idle" : allowedTarget ? "pass" : "fail",
    spendcap: !proposed || spendCap === undefined ? "idle" : proposed.value > spendCap ? "fail" : "pass",
  };

  const amountStr = proposed ? `${fmtAmount(proposed.value)} tBNB` : "—";

  // --- handlers ---
  const onPropose = () => {
    if (!isAddress(recipient)) {
      notification.error("Enter a valid recipient address");
      return;
    }
    let value: bigint;
    try {
      value = parseEther(amount || "0");
    } catch {
      notification.error("Enter a valid amount");
      return;
    }
    setExecuted(false);
    setTxHash(undefined);
    setProposed({ target: recipient, value });
  };

  const onExecute = async () => {
    if (!proposed) return;
    try {
      const hash = await writeContractAsync({
        functionName: "execute",
        args: [proposed.target, proposed.value, "0x"],
        value: proposed.value,
      });
      if (hash) {
        setTxHash(hash);
        setExecuted(true);
      }
    } catch {
      // useScaffoldWriteContract already surfaces a notification
    }
  };

  const onScenario = (name: string) => {
    if (name === "approved") setAmount("0.02");
    else if (name === "cap") setAmount(spendCap ? (Number(formatEther(spendCap)) + 1).toString() : "2");
    else if (name === "allow") {
      setAmount("0.1");
      setRecipient(DEAD);
    }
    setActiveScenario(name);
  };

  const editRecipient = (v: string) => {
    setRecipient(v);
    setActiveScenario(null);
  };
  const editAmount = (v: string) => {
    setAmount(v);
    setActiveScenario(null);
  };

  // --- activity feed rows ---
  const feedRows: FeedRow[] = useMemo(() => {
    type Raw = { block: bigint; logIndex: number; row: FeedRow };
    const raws: Raw[] = [];

    (executedEv.data ?? []).forEach((e: any) => {
      raws.push({
        block: e.blockNumber ?? 0n,
        logIndex: e.logIndex ?? 0,
        row: {
          id: `ex-${e.transactionHash}-${e.logIndex}`,
          variant: "executed",
          amountStr: `${fmtAmount(e.args.value as bigint)} tBNB`,
          recipient: e.args.target as string,
          meta: `Executed · ${timeAgo(e.blockData?.timestamp)} · ${shortHash(e.transactionHash)}`,
          badge: "Executed",
        },
      });
    });

    (targetEv.data ?? []).forEach((e: any) => {
      raws.push({
        block: e.blockNumber ?? 0n,
        logIndex: e.logIndex ?? 0,
        row: {
          id: `ts-${e.transactionHash}-${e.logIndex}`,
          variant: "policy",
          title: `Allow-list ${e.args.allowed ? "added" : "removed"} · ${shortHash(e.args.target as string)}`,
          meta: `Policy update · ${timeAgo(e.blockData?.timestamp)}`,
          badge: "Policy",
        },
      });
    });

    (pausedEv.data ?? []).forEach((e: any) => {
      raws.push({
        block: e.blockNumber ?? 0n,
        logIndex: e.logIndex ?? 0,
        row: {
          id: `ps-${e.transactionHash}-${e.logIndex}`,
          variant: "policy",
          title: e.args.paused ? "Payments paused" : "Payments resumed",
          meta: `Policy update · ${timeAgo(e.blockData?.timestamp)}`,
          badge: "Policy",
        },
      });
    });

    (capEv.data ?? []).forEach((e: any) => {
      raws.push({
        block: e.blockNumber ?? 0n,
        logIndex: e.logIndex ?? 0,
        row: {
          id: `cap-${e.transactionHash}-${e.logIndex}`,
          variant: "policy",
          title: `Spend cap set to ${fmtAmount(e.args.cap as bigint)} tBNB`,
          meta: `Policy update · ${timeAgo(e.blockData?.timestamp)}`,
          badge: "Policy",
        },
      });
    });

    raws.sort((a, b) => (a.block === b.block ? b.logIndex - a.logIndex : Number(b.block - a.block)));
    return raws.map(r => r.row);
  }, [executedEv.data, targetEv.data, pausedEv.data, capEv.data]);

  const feedLoading = executedEv.isLoading || targetEv.isLoading || pausedEv.isLoading || capEv.isLoading;

  return (
    <div
      className="min-h-screen px-5 pb-20 flex flex-col items-center"
      style={{ background: "#F4F5F7", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: "#11151C" }}
    >
      <TopBar />

      <div className="w-full max-w-[680px] mt-10">
        <h1 className="text-[27px] font-extrabold tracking-[-0.03em] leading-[1.15]">Guardrail for agent payments</h1>
        <p className="mt-2 text-[15px] text-[#5B626D] leading-[1.5] max-w-[520px]">
          Describe a payment by recipient and amount. PolicyGuard checks every rule on-chain before a single byte
          reaches the network.
        </p>
      </div>

      <ProposeBar
        recipient={recipient}
        onRecipient={editRecipient}
        amount={amount}
        onAmount={editAmount}
        onPropose={onPropose}
        evaluating={evaluating}
        disabled={evaluating}
        activeScenario={activeScenario}
        onScenario={onScenario}
      />

      <VerdictCard
        verdict={verdict}
        loading={evaluating}
        reason={reason}
        amountStr={amountStr}
        target={proposed?.target}
        chain={targetNetwork}
        chips={chips}
        executed={executed}
        txHash={txHash}
        onExecute={onExecute}
        isExecuting={isMining}
        isConnected={!!connectedAddress}
        isOwner={isOwner}
      />

      <ActivityFeed rows={feedRows} count={feedRows.length} loading={feedLoading} chain={targetNetwork} />
    </div>
  );
};

// Maps the contract's terse reason string to the design's fuller copy.
function humanReason(raw: string) {
  if (raw === "exceeds spend cap")
    return "This payment exceeds the spend cap. No funds moved and the nonce was never used.";
  if (raw === "target not on allow-list")
    return "The recipient isn't on your approved allow-list. No funds moved and the nonce was never used.";
  if (raw === "paused") return "Payments are currently paused. No funds moved and the nonce was never used.";
  return raw;
}

export default Home;
