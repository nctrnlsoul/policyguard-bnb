"use client";

import { AddressInput } from "@scaffold-ui/components";
import { ACCENT } from "~~/components/policyguard/theme";

export type Scenario = { name: string; label: string; rgb: string };

// Demo presets prefill the amount only (the design's mock toggle). They cannot
// auto-pick a real allow-listed address, so the recipient is left for the user.
export const SCENARIOS: Scenario[] = [
  { name: "approved", label: "Under cap", rgb: "22,163,74" },
  { name: "cap", label: "Spend cap", rgb: "229,72,77" },
  { name: "allow", label: "Allow-list", rgb: "229,72,77" },
];

type Props = {
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

export const ProposeBar = ({
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
      <div className="bg-white border border-[#E2E5EA] rounded-[16px] p-3 shadow-[0_4px_16px_rgba(16,20,28,0.05)]">
        <div className="flex flex-col md:flex-row gap-3 md:items-end">
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
            style={{ background: ACCENT, color: "#191B1F" }}
            className="flex-none cursor-pointer border-none font-bold text-[14.5px] px-5 py-[11px] rounded-[11px] flex items-center justify-center gap-2 shadow-[0_1px_2px_rgba(240,185,11,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            <span>{evaluating ? "Checking" : "Propose"}</span>
            {evaluating && (
              <span
                className="inline-block w-[14px] h-[14px] rounded-full"
                style={{
                  border: "2px solid rgba(25,27,31,0.3)",
                  borderTopColor: "#191B1F",
                  animation: "pg-spin 0.6s linear infinite",
                }}
              />
            )}
          </button>
        </div>
      </div>

      {/* Demo presets — prefill the amount, matching the design's toggle */}
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
    </div>
  );
};
