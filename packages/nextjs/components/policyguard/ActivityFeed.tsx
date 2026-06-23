"use client";

import { Address } from "@scaffold-ui/components";
import type { Chain } from "viem";
import { ACCENT, GREEN } from "~~/components/policyguard/theme";

export type FeedRow = {
  id: string;
  variant: "executed" | "policy";
  amountStr?: string; // executed
  recipient?: string; // executed (target address)
  title?: string; // policy
  meta: string;
  badge: string;
};

const POLICY = { dot: ACCENT, text: "#9A7B0A", bg: "#FFFBEB", border: "#F5E6B8" };

const Arrow = () => (
  <span className="text-[#C3C8D0] flex items-center">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 12h15M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </span>
);

export const ActivityFeed = ({
  rows,
  count,
  loading,
  chain,
}: {
  rows: FeedRow[];
  count: number;
  loading: boolean;
  chain: Chain;
}) => {
  return (
    <div className="w-full max-w-[680px] mt-[34px]">
      <div className="flex items-center justify-between px-1 pb-3">
        <h3 className="text-[15px] font-bold tracking-[-0.01em]">Activity</h3>
        <span className="text-[12.5px] font-semibold text-[#9AA1AC]">
          {loading ? "loading…" : `${count} on-chain event${count === 1 ? "" : "s"}`}
        </span>
      </div>

      <div className="bg-white border border-[#E8EAEE] rounded-[18px] overflow-hidden shadow-[0_2px_10px_rgba(16,20,28,0.04)]">
        {rows.length === 0 && !loading && (
          <div className="px-[18px] py-[26px] text-center text-[13.5px] text-[#9AA1AC]">
            No on-chain activity yet. Executed payments and policy changes will appear here.
          </div>
        )}

        {rows.map((f, i) => {
          const c = f.variant === "executed" ? GREEN : POLICY;
          return (
            <div
              key={f.id}
              className="flex items-center gap-[14px] px-[18px] py-[15px]"
              style={{ borderTop: i > 0 ? "1px solid #F0F1F4" : undefined }}
            >
              <div
                className="w-[34px] h-[34px] rounded-[10px] flex-none flex items-center justify-center"
                style={{ background: c.bg, border: `1px solid ${c.border}` }}
              >
                {f.variant === "executed" ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 12.5l4.2 4.2L19 7"
                      stroke={c.dot}
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 8v5M12 16h.01M10.3 3.9l-7 12.1A1.5 1.5 0 0 0 4.6 18.3h14.8a1.5 1.5 0 0 0 1.3-2.3l-7-12.1a1.5 1.5 0 0 0-2.6 0z"
                      stroke={c.dot}
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {f.variant === "executed" ? (
                    <>
                      <span className="text-[14.5px] font-bold tabular-nums tracking-[-0.01em]">{f.amountStr}</span>
                      <Arrow />
                      {f.recipient ? (
                        <Address address={f.recipient} chain={chain} size="sm" />
                      ) : (
                        <span className="text-[14px] font-semibold text-[#2C313A]">—</span>
                      )}
                    </>
                  ) : (
                    <span className="text-[14px] font-semibold text-[#2C313A]">{f.title}</span>
                  )}
                </div>
                <div className="mt-[2px] text-[12px] text-[#9AA1AC]">{f.meta}</div>
              </div>

              <div
                className="flex-none text-[12px] font-bold px-[11px] py-[5px] rounded-full"
                style={{ color: c.text, background: c.bg, border: `1px solid ${c.border}` }}
              >
                {f.badge}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
