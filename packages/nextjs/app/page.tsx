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
import { useActivityFeed } from "~~/components/policyguard/useActivityFeed";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

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
  const [nlText, setNlText] = useState("Pay 0.02 BNB to vendor");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<{ address: string; valueBnb: string; label: string; reasoning: string } | null>(
    null,
  );
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
  // Read from transaction receipts, not eth_getLogs: the contract's events are
  // ~700k blocks old and no keyless BSC-testnet RPC serves historical getLogs
  // (see useActivityFeed for the full explanation).
  const { events: activityEvents, isLoading: feedLoading } = useActivityFeed();

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

  const amountStr = proposed ? `${fmtAmount(proposed.value)} tBNB` : "-";

  // --- handlers ---
  // Plain-English path: the LLM proposes {address, value}; the result still
  // flows through check() and can be denied. The model never pre-judges policy.
  const onNlPropose = async () => {
    const text = nlText.trim();
    if (!text) {
      notification.error("Describe a payment first");
      return;
    }
    setParsing(true);
    setParsed(null);
    setProposed(null);
    setExecuted(false);
    setTxHash(undefined);
    try {
      const res = await fetch("/api/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        notification.error(data?.error ?? "Could not parse the request");
        return;
      }
      let value: bigint;
      try {
        value = parseEther(data.valueBnb);
      } catch {
        notification.error("The agent returned an invalid amount");
        return;
      }
      setParsed({ address: data.address, valueBnb: data.valueBnb, label: data.label, reasoning: data.reasoning });
      setProposed({ target: data.address, value });
    } catch {
      notification.error("Network error reaching the agent");
    } finally {
      setParsing(false);
    }
  };

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
    setParsed(null);
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

  // Presets fill the plain-English bar with a phrase that exercises each rule.
  // The LLM still parses it and the contract still judges it.
  const onScenario = (name: string) => {
    if (name === "approved") setNlText("Pay 0.02 BNB to vendor");
    else if (name === "cap") setNlText("Pay 2 BNB to vendor");
    else if (name === "allow") setNlText(`Pay 0.1 BNB to ${DEAD}`);
    setActiveScenario(name);
  };

  const editNlText = (v: string) => {
    setNlText(v);
    setActiveScenario(null);
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

    activityEvents.forEach(e => {
      const base = { block: e.blockNumber, logIndex: e.logIndex };
      const id = `${e.transactionHash}-${e.logIndex}`;

      if (e.eventName === "Executed") {
        raws.push({
          ...base,
          row: {
            id,
            variant: "executed",
            amountStr: `${fmtAmount(e.args.value as bigint)} tBNB`,
            recipient: e.args.target as string,
            meta: `Executed · ${timeAgo(e.timestamp)} · ${shortHash(e.transactionHash)}`,
            badge: "Executed",
          },
        });
      } else if (e.eventName === "TargetSet") {
        raws.push({
          ...base,
          row: {
            id,
            variant: "policy",
            title: `Allow-list ${e.args.allowed ? "added" : "removed"} · ${shortHash(e.args.target as string)}`,
            meta: `Policy update · ${timeAgo(e.timestamp)}`,
            badge: "Policy",
          },
        });
      } else if (e.eventName === "PausedSet") {
        raws.push({
          ...base,
          row: {
            id,
            variant: "policy",
            title: e.args.paused ? "Payments paused" : "Payments resumed",
            meta: `Policy update · ${timeAgo(e.timestamp)}`,
            badge: "Policy",
          },
        });
      } else if (e.eventName === "SpendCapSet") {
        raws.push({
          ...base,
          row: {
            id,
            variant: "policy",
            title: `Spend cap set to ${fmtAmount(e.args.cap as bigint)} tBNB`,
            meta: `Policy update · ${timeAgo(e.timestamp)}`,
            badge: "Policy",
          },
        });
      }
    });

    raws.sort((a, b) => (a.block === b.block ? b.logIndex - a.logIndex : Number(b.block - a.block)));
    return raws.map(r => r.row);
  }, [activityEvents]);

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
        nlText={nlText}
        onNlText={editNlText}
        onNlPropose={onNlPropose}
        parsing={parsing}
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

      {parsed && (
        <div className="w-full max-w-[680px] mt-5 bg-white border border-[#E2E5EA] rounded-[14px] px-4 py-3 shadow-[0_2px_10px_rgba(16,20,28,0.04)]">
          <div className="text-[10.5px] font-semibold tracking-[0.05em] uppercase text-[#9AA1AC] mb-[5px]">
            Agent proposed
          </div>
          <div className="text-[14.5px] font-medium text-[#11151C] leading-[1.45]">
            Pay <span className="font-bold">{parsed.valueBnb} tBNB</span> to{" "}
            {parsed.label ? <span className="font-bold">{parsed.label} </span> : null}
            <span className="font-mono text-[13px] text-[#5B626D]">{shortHash(parsed.address)}</span>
          </div>
          {parsed.reasoning && (
            <div className="mt-1 text-[12.5px] text-[#9AA1AC] leading-[1.5]">{parsed.reasoning}</div>
          )}
          <div className="mt-2 text-[11.5px] text-[#9AA1AC] leading-[1.5]">
            The agent proposed this. PolicyGuard, not the model, makes the allow/deny call below.
          </div>
        </div>
      )}

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
