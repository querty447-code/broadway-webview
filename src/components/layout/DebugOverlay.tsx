'use client';

import { useEffect, useMemo, useState } from 'react';
import { isReactNativeWebView, useRNBridge } from '@/lib/bridge';

type DebugOverlayProps = {
  requestHeaders: Record<string, string>;
};

type SaleDebugClick = {
  action: string;
  inWebView: boolean;
  item?: unknown;
  at: number;
};

type TimelineEvent = {
  id: string;
  at: number;
  source: 'native' | 'web' | 'tap';
  title: string;
  body: unknown;
};

export function DebugOverlay({ requestHeaders }: DebugOverlayProps) {
  const { isWebView, recentBridgeEvents, recentNativeEvents } = useRNBridge();
  const [open, setOpen] = useState(true);
  const [taps, setTaps] = useState<SaleDebugClick[]>([]);

  useEffect(() => {
    const handleClick = (event: Event) => {
      const detail = (event as CustomEvent<SaleDebugClick>).detail;
      if (detail) setTaps((prev) => [detail, ...prev.slice(0, 19)]);
    };

    window.addEventListener('sale-debug-click', handleClick);
    return () => window.removeEventListener('sale-debug-click', handleClick);
  }, []);

  const timeline = useMemo<TimelineEvent[]>(() => {
    const incoming = recentNativeEvents.map((event, index) => ({
      id: `in-${event.timestamp ?? 0}-${index}`,
      at: event.timestamp ?? Date.now(),
      source: 'native' as const,
      title: event.type,
      body: event.payload,
    }));

    const outgoing = recentBridgeEvents.map((event, index) => ({
      id: `out-${event.timestamp}-${index}`,
      at: event.timestamp,
      source: 'web' as const,
      title: event.type,
      body: event.payload,
    }));

    const tapEvents = taps.map((tap, index) => ({
      id: `tap-${tap.at}-${index}`,
      at: tap.at,
      source: 'tap' as const,
      title: tap.action,
      body: tap,
    }));

    return [...incoming, ...outgoing, ...tapEvents].sort((a, b) => b.at - a.at).slice(0, 20);
  }, [recentBridgeEvents, recentNativeEvents, taps]);

  const headerEntries = Object.entries(requestHeaders);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex justify-center px-3 pb-2">
      <section className="pointer-events-auto w-full max-w-lg overflow-hidden rounded-2xl border border-amber-400/70 bg-[#2A1D04]/95 text-amber-100 shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="text-sm font-semibold tracking-wide">Warning · WebView debug</span>
          <span className="text-[11px] uppercase text-amber-300/80">{open ? 'Hide' : 'Show'}</span>
        </button>

        {open && (
          <div className="max-h-[45vh] space-y-3 overflow-y-auto border-t border-amber-400/30 px-3 py-3 text-[11px] leading-4">
            <p className="text-amber-200/90">
              Host: {isWebView ? 'WebView hook yes' : 'WebView hook no'} · RN object:{' '}
              {isReactNativeWebView() ? 'yes' : 'no'}
            </p>

            <div>
              <p className="mb-1 font-semibold uppercase tracking-wide text-amber-300">Headers</p>
              {headerEntries.length === 0 ? (
                <p className="text-amber-100/70">No request headers captured.</p>
              ) : (
                <pre className="overflow-x-auto rounded-lg bg-black/35 p-2 text-amber-100">
                  {JSON.stringify(requestHeaders, null, 2)}
                </pre>
              )}
            </div>

            <div>
              <p className="mb-1 font-semibold uppercase tracking-wide text-amber-300">
                Mobile events · {timeline.length}
              </p>
              {timeline.length === 0 ? (
                <p className="text-amber-100/70">
                  No mobile events yet. Tap Add to cart, or wait for SET_USER_DATA from native.
                </p>
              ) : (
                <ol className="space-y-2">
                  {timeline.map((event) => (
                    <li key={event.id} className="rounded-lg bg-black/35 p-2">
                      <p className="font-semibold text-amber-300">
                        {event.source === 'native' ? 'Native → Web' : event.source === 'web' ? 'Web → Native' : 'Tap'} ·{' '}
                        {event.title}
                      </p>
                      <pre className="mt-1 overflow-x-auto text-amber-100">
                        {JSON.stringify(event.body, null, 2)}
                      </pre>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
