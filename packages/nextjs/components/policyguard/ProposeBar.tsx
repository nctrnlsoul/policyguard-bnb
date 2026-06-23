"use client";

import { AddressInput } from "@scaffold-ui/components";
import { ACCENT } from "~~/components/policyguard/theme";

export type Scenario = { name: string; label: string; rgb: string };

// Demo presets prefill the plain-English bar with a phrase that exercises each
// rule. The LLM still parses them and the contract still judges them.
export const SCENARIOS: Scenario[] = [
  { name: "approved", label: "Under cap", rgb: "22,163,74" },
  { name: "cap", label: "Spend cap", rgb: "229,72,77" },
  { name: "allow", label: "Allow-list", rgb: "229,72,77" },
];

type Props = {
  nlText: string;
  onNlText: (v: string) => void;
  onNlPropose: () => void;
  parsing: boolean;
  recipient: string;
  onRecipient: (v: string) => void;
  amount: string;
  onAmount: (v: string) => void;
  onPropose: () => void;
  evaluating: boolean;
  disabled: boolean;
  activeScenario: string | null;
  onScenario: (name: string) => void;
};

const labelCls = "text-[10.5px] font-semibold tracking-[0.05em] uppercase text-[#9AA1AC] mb-[6px] block";

const Spinner = () => (
  <span
    className="inline-block w-[14px] h-[14px] rounded-full"
    style={{
      border: "2px solid rgba(25,27,31,0.3)",
      borderTopColor: "#191B1F",
      animation: "pg-spin 0.6s linear infinite",
    }}
  />
);

export const ProposeBar = ({
  nlText,
  onNlText,
  onNlPropose,
  parsing,
  recipient,
  onRecipient,
  amount,
  onAmount,
  onPropose,
  evaluating,
  disabled,
  activeScenario,
  onScenario,
}: Props) => {
  return (
    <div className="w-full max-w-[680px] mt-5">
      {/* Primary: plain-English request the LLM turns into a proposal */}
      <div className="bg-white border border-[#E2E5EA] rounded-[16px] p-3 shadow-[0_4px_16px_rgba(16,20,28,0.05)]">
        <label className={labelCls}>Describe a payment</label>
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="flex-1 min-w-0 flex items-center bg-white border border-[#E2E5EA] rounded-[12px] px-3 h-[44px] focus-within:border-[#F0B90B] transition-colors">
            <input
              value={nlText}
              onChange={e => onNlText(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") onNlPropose();
              }}
              placeholder="Pay 0.02 BNB to vendor"
              className="flex-1 min-w-0 border-none outline-none bg-transparent text-[15.5px] font-medium text-[#11151C]"
            />
          </div>
          <button
            onClick={onNlPropose}
            disabled={disabled || parsing}
            style={{ background: ACCENT, color: "#191B1F" }}
            className="flex-none cursor-pointer border-none font-bold text-[14.5px] px-5 py-[11px] rounded-[11px] flex items-center justify-center gap-2 shadow-[0_1px_2px_rgba(240,185,11,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            <span>{parsing ? "Parsing" : "Propose"}</span>
            {parsing && <Spinner />}
          </button>
        </div>
        <p className="mt-2 text-[11.5px] text-[#9AA1AC] leading-[1.5]">
          The agent only proposes. PolicyGuard still checks every rule on-chain before anything executes.
        </p>
      </div>

      {/* Demo presets fill the bar with a phrase that exercises each rule */}
      <div className="mt-[18px] flex items-center gap-[10px]">
        <span className="text-[11px] font-bold tracking-[0.06em] uppercase text-[#9AA1AC] flex-none">Demo</span>
        <div className="flex gap-1 bg-white border border-[#E6E8EC] rounded-[13px] p-1 shadow-[0_1px_2px_rgba(16,20,28,0.04)]">
          {SCENARIOS.map(s => {
            const active = activeScenario === s.name;
            return (
              <button
                key={s.name}
                onClick={() => onScenario(s.name)}
                className="flex items-center gap-[7px] cursor-pointer border-none text-[13px] font-bold tracking-[-0.01em] px-[13px] py-[7px] rounded-[9px] transition-colors"
                style={{
                  background: active ? "#11151C" : "transparent",
                  color: active ? "#fff" : "#5B626D",
                }}
              >
                <span
                  className="w-[6px] h-[6px] rounded-full flex-none"
                  style={{ background: `rgb(${s.rgb})`, opacity: active ? 1 : 0.55 }}
                />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Secondary: manual override, bypass the LLM and set the fields directly */}
      <details className="mt-4 bg-white border border-[#E2E5EA] rounded-[16px] shadow-[0_4px_16px_rgba(16,20,28,0.05)] group">
        <summary className="cursor-pointer list-none px-4 py-3 text-[12.5px] font-semibold text-[#5B626D] flex items-center justify-between">
          <span>Manual override</span>
          <span className="text-[#9AA1AC] group-open:rotate-180 transition-transform">▾</span>
        </summary>
        <div className="px-3 pb-3 flex flex-col md:flex-row gap-3 md:items-end">
          <div className="md:w-[190px]">
            <label className={labelCls}>Amount</label>
            <div className="flex items-center bg-white border border-[#E2E5EA] rounded-[12px] px-3 h-[44px] focus-within:border-[#F0B90B] transition-colors">
              <input
                value={amount}
                onChange={e => onAmount(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") onPropose();
                }}
                inputMode="decimal"
                placeholder="0.02"
                className="flex-1 min-w-0 border-none outline-none bg-transparent text-[15.5px] font-medium text-[#11151C]"
              />
              <span className="text-[12.5px] font-semibold text-[#9AA1AC] ml-2 flex-none">tBNB</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <label className={labelCls}>Recipient</label>
            <AddressInput value={recipient} onChange={onRecipient} placeholder="0x… target address" />
          </div>
          <button
            onClick={onPropose}
            disabled={disabled}
            style={{ background: "#11151C", color: "#fff" }}
            className="flex-none cursor-pointer border-none font-bold text-[14.5px] px-5 py-[11px] rounded-[11px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            <span>{evaluating ? "Checking" : "Propose"}</span>
            {evaluating && <Spinner />}
          </button>
        </div>
      </details>
    </div>
  );
};
