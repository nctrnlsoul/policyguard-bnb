"use client";

import type { Chain } from "viem";
import { ACCENT, GREEN } from "~~/components/policyguard/theme";
import { getBlockExplorerTxLink } from "~~/utils/scaffold-eth";

export type FeedRow = {
  id: string;
  variant: "executed" | "policy";
  amountStr?: string; // executed
  recipient?: string; // executed (full target address)
  recipientLabel?: string; // executed (optional context tag, e.g. "Demo vendor")
  txHash?: string; // full transaction hash, for the Tx: link
  title?: string; // policy
  meta: string;
  badge: string;
};

const POLICY = { dot: ACCENT, text: "#9A7B0A", bg: "#FFFBEB", border: "#F5E6B8" };

// Per-variant hover styling for the identifier links. Literal class strings so
// Tailwind statically extracts them; tied to the green/yellow row coding.
const HOVER = {
  executed: { bg: "hover:bg-[#F1FAF4]", text: "group-hover:text-[#15803D]" },
  policy: { bg: "hover:bg-[#FFFBEB]", text: "group-hover:text-[#9A7B0A]" },
};

const short = (h?: string) => (h ? `${h.slice(0, 6)}…${h.slice(-4)}` : "");

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

// A labeled identifier (To: / Tx:) rendered as a generous, hoverable hit area
// that links to the right BscScan page. Falls back to plain text if no link.
const IdLink = ({
  label,
  href,
  value,
  hover,
}: {
  label: string;
  href: string;
  value: string;
  hover: { bg: string; text: string };
}) => {
  const inner = (
    <>
      <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#9AA1AC]">{label}</span>
      <span
        className={`font-mono text-[12.5px] font-semibold text-[#2C313A] underline-offset-2 group-hover:underline ${hover.text}`}
      >
        {short(value)}
      </span>
    </>
  );

  if (!href) {
    return <span className="inline-flex items-center gap-[5px] px-2 py-[5px]">{inner}</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={value}
      className={`group inline-flex items-center gap-[5px] -mx-1 px-2 py-[5px] rounded-[9px] transition-colors ${hover.bg}`}
    >
      {inner}
    </a>
  );
};

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
  const explorer = chain.blockExplorers?.default?.url;
  const addressLink = (addr?: string) => (explorer && addr ? `${explorer}/address/${addr}` : "");

  return (
    <div className="w-full max-w-[680px] mt-[34px]">
      <div className="flex items-center justify-between px-1 pb-1">
        <h3 className="text-[15px] font-bold tracking-[-0.01em]">Activity</h3>
        <span className="text-[12.5px] font-semibold text-[#9AA1AC]">
          {loading ? "loading…" : `${count} verified example${count === 1 ? "" : "s"}`}
        </span>
      </div>
      <p className="px-1 pb-3 text-[12px] text-[#9AA1AC] leading-[1.5]">
        Reference transactions from this PolicyGuard contract on BNB testnet.
      </p>

      <div className="bg-white border border-[#E8EAEE] rounded-[18px] overflow-hidden shadow-[0_2px_10px_rgba(16,20,28,0.04)]">
        {rows.length === 0 && !loading && (
          <div className="px-[18px] py-[26px] text-center text-[13.5px] text-[#9AA1AC]">
            No on-chain activity yet. Executed payments and policy changes will appear here.
          </div>
        )}

        {rows.map((f, i) => {
          const c = f.variant === "executed" ? GREEN : POLICY;
          const hover = f.variant === "executed" ? HOVER.executed : HOVER.policy;
          const txUrl = f.txHash ? getBlockExplorerTxLink(chain.id, f.txHash) : "";
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
                <div className="flex items-center gap-1.5 flex-wrap">
                  {f.variant === "executed" ? (
                    <>
                      <span className="text-[14.5px] font-bold tabular-nums tracking-[-0.01em]">{f.amountStr}</span>
                      <Arrow />
                      {f.recipient ? (
                        <IdLink label="To" href={addressLink(f.recipient)} value={f.recipient} hover={hover} />
                      ) : (
                        <span className="text-[14px] font-semibold text-[#2C313A]">-</span>
                      )}
                      {f.recipientLabel && (
                        <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#9AA1AC] bg-[#F2F3F5] border border-[#E6E8EC] px-[7px] py-[3px] rounded-full">
                          {f.recipientLabel}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-[14px] font-semibold text-[#2C313A]">{f.title}</span>
                  )}
                </div>
                <div className="mt-[2px] flex items-center gap-1 flex-wrap">
                  <span className="text-[12px] text-[#9AA1AC]">{f.meta}</span>
                  {f.txHash && <IdLink label="Tx" href={txUrl} value={f.txHash} hover={hover} />}
                </div>
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
