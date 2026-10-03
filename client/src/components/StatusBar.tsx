import { useEffect, useState } from "react";
import type { ConnectionStatus } from "../types.ts";

interface StatusBarProps {
  status: ConnectionStatus;
  tickerCount: number;
  lastUpdate: number | null;
  retryCount: number;
}

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  open: "Live",
  connecting: "Connecting…",
  closed: "Disconnected",
  error: "Error",
};

const STATUS_DOT: Record<ConnectionStatus, string> = {
  open: "bg-emerald-400",
  connecting: "animate-pulse bg-yellow-400",
  closed: "bg-gray-500",
  error: "bg-rose-400",
};

function formatRelative(lastUpdate: number | null, now: number): string {
  if (lastUpdate === null) {
    return "—";
  }

  const seconds = Math.max(0, Math.floor((now - lastUpdate) / 1000));
  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function StatusBar({ status, tickerCount, lastUpdate, retryCount }: StatusBarProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      clearInterval(id);
    };
  }, []);

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-gray-800 px-6 py-3">
      <div>
        <p className="text-sm font-semibold text-white">Live Market Pulse</p>
        <p className="text-xs text-gray-400">Powered by Binance WebSocket</p>
      </div>
      <div
        className={`flex flex-wrap items-center gap-x-5 gap-y-1 text-sm ${status === "connecting" ? "animate-pulse" : ""}`}
      >
        <span className="text-gray-400">{tickerCount} symbols</span>
        <span className="flex items-center gap-2 text-white">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_DOT[status]}`} />
          {STATUS_LABEL[status]}
        </span>
        {status !== "open" ? (
          <span className="text-xs text-gray-500">Attempt {retryCount}</span>
        ) : null}
        <span className="text-gray-400">Updated: {formatRelative(lastUpdate, now)}</span>
      </div>
    </header>
  );
}
