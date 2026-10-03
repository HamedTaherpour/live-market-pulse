import type { NormalizedTicker } from "../types.ts";
import { COIN_META } from "../utils/coinMeta.ts";

interface TickerCardProps {
  ticker: NormalizedTicker;
  flash: boolean;
  flashColor: "emerald" | "rose";
  onClick: () => void;
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

export function TickerCard({ ticker, flash, flashColor, onClick }: TickerCardProps) {
  const changePercent = Number.parseFloat(ticker.changePercent);
  const positive = changePercent >= 0;
  const formattedChange = Math.abs(changePercent).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const badgeTone = positive ? "bg-emerald-950 text-emerald-400" : "bg-rose-950 text-rose-400";
  const priceTone =
    changePercent > 0 ? "text-emerald-400" : changePercent < 0 ? "text-rose-400" : "text-white";
  const flashClass = flash ? (flashColor === "emerald" ? "flash-emerald" : "flash-rose") : "";
  const coin = COIN_META[ticker.symbol];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full cursor-pointer rounded-2xl border border-gray-800 bg-gray-900 p-5 text-left transition-all duration-200 hover:scale-[1.02] hover:border-gray-600 hover:bg-gray-800/50 ${flashClass}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-wide text-white">
          {coin ? `${coin.emoji} ` : ""}
          {displaySymbol(ticker.symbol)}
        </h2>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-sm font-medium ${badgeTone}`}>
          {positive ? "+" : "-"}
          {formattedChange}% {positive ? "↑" : "↓"}
        </span>
      </div>
      <p className={`mt-4 text-3xl font-semibold tracking-tight tabular-nums ${priceTone}`}>
        ${formatPrice(ticker.price)}
      </p>
      <p className="mt-4 text-sm text-gray-400 tabular-nums">
        H ${formatPrice(ticker.high)}
        <span className="ml-3">L ${formatPrice(ticker.low)}</span>
      </p>
      <p className="mt-1 text-sm text-gray-400 tabular-nums">Vol {formatVolume(ticker.volume)}</p>
    </button>
  );
}
