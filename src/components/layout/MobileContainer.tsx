"use client";

import React, { ReactNode } from "react";
import { useRNBridge } from "@/lib/bridge";
import { DebugOverlay } from "./DebugOverlay";

interface MobileContainerProps {
  children: ReactNode;
  requestHeaders: Record<string, string>;
}

export function MobileContainer({ children, requestHeaders }: MobileContainerProps) {
  const { safeAreaInsets } = useRNBridge();
  return (
    <main
      className="relative min-h-screen w-full bg-[var(--bg-main)] text-[var(--text-main)] flex flex-col mx-auto max-w-lg"
      style={
        {
          // paddingTop:
          //   safeAreaInsets.top > 0 ? `${safeAreaInsets.top}px` : "env(safe-area-inset-top, 0px)",
          // paddingBottom:
          //   safeAreaInsets.bottom > 0
          //     ? `${safeAreaInsets.bottom}px`
          //     : "env(safe-area-inset-bottom, 0px)",
        }
      }
    >
      {children}
      <DebugOverlay requestHeaders={requestHeaders} />
    </main>
  );
}
