import { useEffect, useRef, useState } from "react";
import { ChartModal } from "./components/ChartModal.tsx";
import { DisconnectedBanner } from "./components/DisconnectedBanner.tsx";
import { StatusBar } from "./components/StatusBar.tsx";
import { TickerCard } from "./components/TickerCard.tsx";
import { TickerCardSkeleton } from "./components/TickerCardSkeleton.tsx";
import { useMarketSocket } from "./hooks/useMarketSocket.ts";
import { usePriceHistory } from "./hooks/usePriceHistory.ts";
import type { NormalizedTicker, TickerMap } from "./types.ts";

const SYMBOL_ORDER = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT"];

function listTickers(tickers: TickerMap): NormalizedTicker[] {
  return SYMBOL_ORDER.map((symbol) => tickers[symbol]).filter(
    (ticker): ticker is NormalizedTicker => Boolean(ticker),
  );
}

function App() {
  const { tickers, status, retryCount } = useMarketSocket();
  const history = usePriceHistory(tickers);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [flash, setFlash] = useState<Record<string, boolean>>({});
  const previousPrices = useRef<Record<string, string>>({});
  const flashTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    for (const ticker of Object.values(tickers)) {
      const previous = previousPrices.current[ticker.symbol];
      previousPrices.current[ticker.symbol] = ticker.price;
      if (previous === undefined || previous === ticker.price) {
        continue;
      }

      const symbol = ticker.symbol;
      const pending = flashTimers.current[symbol];
      if (pending !== undefined) {
        clearTimeout(pending);
      }

      setFlash((current) => ({ ...current, [symbol]: true }));
      flashTimers.current[symbol] = setTimeout(() => {
        setFlash((current) => ({ ...current, [symbol]: false }));
        delete flashTimers.current[symbol];
      }, 600);
    }
  }, [tickers]);

  useEffect(() => {
    const timers = flashTimers.current;
    return () => {
      for (const timer of Object.values(timers)) {
        clearTimeout(timer);
      }
    };
  }, []);

  const cards = listTickers(tickers);
  let lastUpdate: number | null = null;
  for (const ticker of cards) {
    if (lastUpdate === null || ticker.timestamp > lastUpdate) {
      lastUpdate = ticker.timestamp;
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-950 font-sans text-white">
      <StatusBar
        status={status}
        tickerCount={cards.length}
        lastUpdate={lastUpdate}
        retryCount={retryCount}
      />
      <DisconnectedBanner status={status} />
      <h1 className="mt-8 text-center text-3xl font-bold text-white">Crypto Market</h1>
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 p-6 sm:grid-cols-2 md:grid-cols-3">
        {Object.keys(tickers).length === 0 && status === "connecting"
          ? Array.from({ length: 5 }, (_, index) => <TickerCardSkeleton key={index} />)
          : cards.map((ticker) => {
              const changePercent = Number.parseFloat(ticker.changePercent);
              return (
                <TickerCard
                  key={ticker.symbol}
                  ticker={ticker}
                  flash={flash[ticker.symbol] === true}
                  flashColor={changePercent >= 0 ? "emerald" : "rose"}
                  onClick={() => setSelectedSymbol(ticker.symbol)}
                />
              );
            })}
      </div>
      <footer className="mt-auto py-6 text-center text-xs text-gray-600">
        Live data via Binance WebSocket · Built with React + TypeScript
      </footer>
      {selectedSymbol !== null ? (
        <ChartModal
          symbol={selectedSymbol}
          ticker={tickers[selectedSymbol]}
          points={history[selectedSymbol] ?? []}
          onClose={() => setSelectedSymbol(null)}
        />
      ) : null}
    </div>
  );
}

export default App;
