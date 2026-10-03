import type { PricePoint } from "../hooks/usePriceHistory.ts";
import type { NormalizedTicker } from "../types.ts";
import { COIN_META } from "../utils/coinMeta.ts";
import { PriceChart } from "./PriceChart.tsx";

interface ChartModalProps {
  symbol: string;
  ticker: NormalizedTicker;
  points: PricePoint[];
  onClose: () => void;
}

function displaySymbol(symbol: string): string {
  return symbol.endsWith("USDT") ? symbol.slice(0, -4) : symbol;
}

function formatPrice(value: string): string {
  const amount = Number.parseFloat(value);
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatVolume(value: string): string {
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount)) {
    return value;
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return value;
}

export function ChartModal({ symbol, ticker, points, onClose }: ChartModalProps) {
  const changePercent = Number.parseFloat(ticker.changePercent);
  const positive = changePercent >= 0;
  const formattedChange = Math.abs(changePercent).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const badgeTone = positive ? "bg-emerald-950 text-emerald-400" : "bg-rose-950 text-rose-400";
  const chartColor = positive ? "#34d399" : "#fb7185";
  const coin = COIN_META[symbol];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-2xl rounded-2xl border border-gray-800 bg-gray-900 p-6"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-semibold tracking-wide text-white">
              {coin ? `${coin.emoji} ` : ""}
              {coin?.name ?? displaySymbol(symbol)}
            </h2>
            <span className="text-sm text-gray-400">{displaySymbol(symbol)}</span>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-sm font-medium ${badgeTone}`}>
              {positive ? "+" : "-"}
              {formattedChange}% {positive ? "↑" : "↓"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-lg text-gray-400 hover:text-white"
          >
            X
          </button>
        </div>
        <p className="mt-4 text-3xl font-semibold tracking-tight text-white tabular-nums">
          ${formatPrice(ticker.price)}
        </p>
        <p className="mt-4 text-sm text-gray-400 tabular-nums">
          H ${formatPrice(ticker.high)}
          <span className="ml-3">L ${formatPrice(ticker.low)}</span>
        </p>
        <p className="mt-1 text-sm text-gray-400 tabular-nums">Vol {formatVolume(ticker.volume)}</p>
        <div className="mt-6">
          <PriceChart symbol={symbol} points={points} color={chartColor} />
        </div>
        <p className="mt-2 text-center text-xs text-gray-500">Last 60 ticks · updates live</p>
      </div>
    </div>
  );
}
