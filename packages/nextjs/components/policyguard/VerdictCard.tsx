"use client";

import { Address } from "@scaffold-ui/components";
import type { Chain } from "viem";
import { ACCENT, GREEN, NEUTRAL, RED } from "~~/components/policyguard/theme";
import type { ChipState } from "~~/components/policyguard/theme";

export type Verdict = "idle" | "blocked" | "approved";

type Props = {
  verdict: Verdict;
  loading: boolean;
  reason: string;
  amountStr: string;
  target?: string;
  chain: Chain;
  chips: { allowlist: ChipState; spendcap: ChipState; pause: ChipState };
  // execute flow
  executed: boolean;
  txHash?: string;
  onExecute: () => void;
  isExecuting: boolean;
  isConnected: boolean;
  isOwner: boolean;
};

const CHIP_PALETTE = {
  pass: { ...GREEN, word: "Pass" },
  ok: { ...GREEN, word: "OK" },
  fail: { ...RED, word: "Fail" },
  idle: { ...NEUTRAL, word: "-" },
} as const;

const Chip = ({ label, state }: { label: string; state: ChipState }) => {
  const p = CHIP_PALETTE[state];
  const emph = state === "fail";
  return (
    <div
      className="text-left p-[12px_13px] rounded-[13px]"
      style={{
        padding: "12px 13px",
        background: p.bg,
        border: `1px solid ${p.border}`,
        boxShadow: emph ? "0 0 0 3px rgba(229,72,77,.1)" : undefined,
      }}
    >
      <div className="text-[10.5px] font-semibold tracking-[0.04em] uppercase text-[#9AA1AC]">{label}</div>
      <div className="mt-[7px] flex items-center gap-[6px]">
        <span
          className="w-[7px] h-[7px] rounded-full flex-none"
          style={{ background: p.dot, boxShadow: emph ? "0 0 0 3px rgba(229,72,77,.18)" : undefined }}
        />
        <span style={{ color: p.text, fontWeight: emph ? 800 : 700 }} className="text-[14px] tracking-[-0.01em]">
          {p.word}
        </span>
      </div>
    </div>
  );
};

export const VerdictCard = ({
  verdict,
  loading,
  reason,
  amountStr,
  target,
  chain,
  chips,
  executed,
  txHash,
  onExecute,
  isExecuting,
  isConnected,
  isOwner,
}: Props) => {
  const haloRgb = verdict === "blocked" ? "229,72,77" : verdict === "approved" ? "22,163,74" : "154,161,172";
  const haloStyle = {
    position: "absolute" as const,
    width: "118px",
    height: "118px",
    borderRadius: "50%",
    background: `radial-gradient(circle, rgba(${haloRgb},.30) 0%, rgba(${haloRgb},0) 68%)`,
    animation: verdict === "idle" ? undefined : "pg-haloPulse 2.6s ease-in-out infinite",
  };

  const accentLine =
    verdict === "blocked"
      ? `linear-gradient(90deg, #E5484D 0%, #E5484D 60%, ${ACCENT} 100%)`
      : verdict === "approved"
        ? `linear-gradient(90deg, #16A34A 0%, #16A34A 60%, ${ACCENT} 100%)`
        : `linear-gradient(90deg, #C3C8D0 0%, #C3C8D0 60%, ${ACCENT} 100%)`;

  return (
    <div
      className="w-full max-w-[680px] mt-[18px] bg-white border border-[#E8EAEE] rounded-[24px] overflow-hidden"
      style={{
        boxShadow: "0 24px 60px -28px rgba(16,20,28,.28), 0 2px 8px rgba(16,20,28,.04)",
        animation: "pg-fadeUp 0.35s ease both",
      }}
    >
      <div style={{ height: "4px", background: accentLine }} />

      <div className="px-9 pt-[38px] pb-[30px] flex flex-col items-center text-center">
        {/* shield badge with halo */}
        <div className="relative w-[120px] h-[120px] flex items-center justify-center">
          <div style={haloStyle} />
          <div
            className="relative w-[86px] h-[86px] rounded-full bg-white border border-[#EDEFF2] flex items-center justify-center"
            style={{ boxShadow: "0 10px 26px -10px rgba(16,20,28,.2)" }}
          >
            {verdict === "blocked" && (
              <>
                <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2.4l7.4 3.2v6.2c0 4.72-3.15 8.92-7.4 10.6C7.75 20.74 4.6 16.54 4.6 11.82V5.6L12 2.4z"
                    fill={ACCENT}
                    fillOpacity=".16"
                    stroke={ACCENT}
                    strokeWidth="1.5"
                  />
                  <path d="M8.4 12.4h7.2" stroke="#E5484D" strokeWidth="2.1" strokeLinecap="round" />
                </svg>
                <div
                  className="absolute right-[-2px] bottom-[-2px] w-[30px] h-[30px] rounded-full bg-[#E5484D] border-[3px] border-white flex items-center justify-center"
                  style={{ boxShadow: "0 4px 10px -2px rgba(229,72,77,.5)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M6 6l12 12M18 6L6 18" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
                  </svg>
                </div>
              </>
            )}
            {verdict === "approved" && (
              <>
                <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2.4l7.4 3.2v6.2c0 4.72-3.15 8.92-7.4 10.6C7.75 20.74 4.6 16.54 4.6 11.82V5.6L12 2.4z"
                    fill="#16A34A"
                    fillOpacity=".13"
                    stroke="#16A34A"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M8.6 12.2l2.4 2.4 4.6-4.9"
                    stroke="#16A34A"
                    strokeWidth="2.1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div
                  className="absolute right-[-2px] bottom-[-2px] w-[30px] h-[30px] rounded-full bg-[#16A34A] border-[3px] border-white flex items-center justify-center"
                  style={{ boxShadow: "0 4px 10px -2px rgba(22,163,74,.45)" }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 12.5l4.2 4.2L19 7"
                      stroke="#fff"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </>
            )}
            {verdict === "idle" && (
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2.4l7.4 3.2v6.2c0 4.72-3.15 8.92-7.4 10.6C7.75 20.74 4.6 16.54 4.6 11.82V5.6L12 2.4z"
                  fill={ACCENT}
                  fillOpacity=".12"
                  stroke="#C3C8D0"
                  strokeWidth="1.5"
                />
              </svg>
            )}
          </div>
        </div>

        {/* status pill + heading */}
        {verdict === "idle" && (
          <>
            <h2 className="mt-[18px] text-[23px] font-extrabold tracking-[-0.025em] leading-[1.2]">
              {loading ? "Checking policy…" : "Ready to check"}
            </h2>
            <p className="mt-[7px] text-[14.5px] text-[#5B626D] leading-[1.5] max-w-[400px]">
              Enter an amount and recipient, then Propose. PolicyGuard runs all three on-chain rules before a single
              byte reaches the network.
            </p>
          </>
        )}

        {verdict === "blocked" && (
          <>
            <div className="mt-[18px] inline-flex items-center gap-[6px] bg-[#FEF1F0] border border-[#F7C9C6] px-[11px] py-[5px] rounded-full">
              <span className="w-[6px] h-[6px] rounded-full bg-[#E5484D]" />
              <span className="text-[11.5px] font-bold tracking-[0.04em] uppercase text-[#C2241F]">
                Payment blocked
              </span>
            </div>
            <h2 className="mt-[14px] text-[23px] font-extrabold tracking-[-0.025em] leading-[1.2]">
              Never broadcast to the network
            </h2>
            <p className="mt-[7px] text-[14.5px] text-[#5B626D] leading-[1.5] max-w-[400px]">{reason}</p>
          </>
        )}

        {verdict === "approved" && (
          <>
            <div className="mt-[18px] inline-flex items-center gap-[6px] bg-[#F1FAF4] border border-[#CDEBD9] px-[11px] py-[5px] rounded-full">
              <span className="w-[6px] h-[6px] rounded-full bg-[#16A34A]" />
              <span className="text-[11.5px] font-bold tracking-[0.04em] uppercase text-[#15803D]">
                {executed ? "Payment executed" : "Payment approved"}
              </span>
            </div>
            <h2 className="mt-[14px] text-[23px] font-extrabold tracking-[-0.025em] leading-[1.2]">
              {executed ? "Executed on-chain" : "Cleared all guardrails"}
            </h2>
            <p className="mt-[7px] text-[14.5px] text-[#5B626D] leading-[1.5] max-w-[420px]">
              {executed ? (
                <>
                  All three guardrails passed. Broadcast to BNB Chain · tx{" "}
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#2C313A", fontWeight: 500 }}>
                    {txHash ? `${txHash.slice(0, 8)}…${txHash.slice(-6)}` : ""}
                  </span>
                </>
              ) : (
                "All three checks pass. Sign the transaction to enforce-and-execute on BNB Chain."
              )}
            </p>
          </>
        )}

        {/* amount → recipient panel (hidden until a proposal exists) */}
        {verdict !== "idle" && (
          <div className="mt-6 w-full max-w-[440px] bg-[#FAFBFC] border border-[#ECEEF1] rounded-[16px] px-5 py-[18px] flex items-center justify-between gap-4">
            <div className="text-left">
              <div className="text-[11px] font-semibold tracking-[0.05em] uppercase text-[#9AA1AC]">Amount</div>
              <div className="mt-[3px] text-[24px] font-extrabold tracking-[-0.02em] tabular-nums">{amountStr}</div>
            </div>
            <div className="text-[#C3C8D0] flex-none">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 12h15M13 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="text-right min-w-0">
              <div className="text-[11px] font-semibold tracking-[0.05em] uppercase text-[#9AA1AC] mb-1">Recipient</div>
              {target ? <Address address={target} chain={chain} /> : <span className="text-[#9AA1AC]">-</span>}
            </div>
          </div>
        )}

        {/* status chips */}
        {verdict !== "idle" && (
          <div className="mt-[14px] w-full max-w-[440px] grid grid-cols-3 gap-[10px]">
            <Chip label="Allow-list" state={chips.allowlist} />
            <Chip label="Spend cap" state={chips.spendcap} />
            <Chip label="Pause" state={chips.pause} />
          </div>
        )}

        {/* execute action (only when approved and not yet executed) */}
        {verdict === "approved" && !executed && (
          <div className="mt-5 w-full max-w-[440px]">
            <button
              onClick={onExecute}
              disabled={!isConnected || !isOwner || isExecuting}
              style={{ background: GREEN.dot, color: "#fff" }}
              className="w-full cursor-pointer border-none font-bold text-[15px] py-[13px] rounded-[12px] flex items-center justify-center gap-2 shadow-[0_8px_20px_-8px_rgba(22,163,74,0.6)] disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {isExecuting && (
                <span
                  className="inline-block w-[15px] h-[15px] rounded-full"
                  style={{
                    border: "2px solid rgba(255,255,255,0.4)",
                    borderTopColor: "#fff",
                    animation: "pg-spin 0.6s linear infinite",
                  }}
                />
              )}
              <span>{isExecuting ? "Executing…" : "Execute on-chain"}</span>
            </button>
            {!isConnected && <p className="mt-[10px] text-[12.5px] text-[#9AA1AC]">Connect your wallet to execute.</p>}
            {isConnected && !isOwner && (
              <p className="mt-[10px] text-[12.5px] text-[#C2241F]">
                Only the operator (contract owner) can execute. You can still check any payment.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
