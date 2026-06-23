"use client";

import { ACCENT } from "~~/components/policyguard/theme";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";

// Top bar from the locked design: shield logo + wordmark on the left, network
// pill + wallet connect on the right.
export const TopBar = () => {
  return (
    <div className="w-full max-w-[680px] flex items-center justify-between pt-[22px] px-[2px]">
      <div className="flex items-center gap-[10px]">
        <div className="w-[30px] h-[30px] rounded-[8px] bg-[#11151C] flex items-center justify-center">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2.5l7.2 3.1v6.05c0 4.6-3.07 8.7-7.2 10.35C7.87 20.35 4.8 16.25 4.8 11.65V5.6L12 2.5z"
              fill={ACCENT}
            />
            <path
              d="M9 12.2l2.1 2.1L15.2 10"
              stroke="#11151C"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span className="text-[16.5px] font-bold tracking-[-0.02em] text-[#11151C]">PolicyGuard</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-[7px] bg-white border border-[#E6E8EC] px-[11px] py-[6px] rounded-full shadow-[0_1px_2px_rgba(16,20,28,0.04)]">
          <span className="w-[7px] h-[7px] rounded-full bg-[#16A34A] shadow-[0_0_0_3px_rgba(22,163,74,0.14)]" />
          <span className="text-[12.5px] font-semibold text-[#3C424D]">BNB Chain · Testnet</span>
        </div>
        <RainbowKitCustomConnectButton />
      </div>
    </div>
  );
};
