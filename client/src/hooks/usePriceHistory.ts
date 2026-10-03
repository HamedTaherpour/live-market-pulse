import { useEffect, useRef, useState } from "react";
import type { TickerMap } from "../types.ts";

export interface PricePoint {
  timestamp: number;
  price: number;
}

export type PriceHistory = Record<string, PricePoint[]>;

const FLUSH_INTERVAL_MS = 1000;

export function usePriceHistory(tickers: TickerMap, maxPoints = 60): PriceHistory {
  const historyRef = useRef<PriceHistory>({});
  const lastFlushRef = useRef(0);
  const [history, setHistory] = useState<PriceHistory>({});

  useEffect(() => {
    let appended = false;

    for (const ticker of Object.values(tickers)) {
      const price = parseFloat(ticker.price);
      if (!Number.isFinite(price)) {
        continue;
      }

      const series = historyRef.current[ticker.symbol] ?? [];
      const last = series.at(-1);
      if (last !== undefined && last.timestamp === ticker.timestamp) {
        continue;
      }

      historyRef.current[ticker.symbol] = series
        .concat({ timestamp: ticker.timestamp, price })
        .slice(-maxPoints);
      appended = true;
    }

    if (!appended) {
      return;
    }

    const now = Date.now();
    if (now - lastFlushRef.current < FLUSH_INTERVAL_MS) {
      return;
    }

    lastFlushRef.current = now;
    setHistory({ ...historyRef.current });
  }, [tickers, maxPoints]);

  return history;
}
