import { useEffect, useRef, useState } from "react";
import type { ConnectionStatus, NormalizedTicker, ServerMessage, TickerMap } from "../types.ts";

const WS_URL = "ws://localhost:8080";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNormalizedTicker(value: unknown): value is NormalizedTicker {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.symbol === "string" &&
    typeof value.price === "string" &&
    typeof value.change === "string" &&
    typeof value.changePercent === "string" &&
    typeof value.high === "string" &&
    typeof value.low === "string" &&
    typeof value.volume === "string" &&
    typeof value.timestamp === "number"
  );
}

function isServerMessage(value: unknown): value is ServerMessage {
  if (!isRecord(value)) {
    return false;
  }

  if (value.type === "ping") {
    return true;
  }

  if (value.type === "ticker") {
    return isNormalizedTicker(value.data);
  }

  if (value.type === "snapshot") {
    return Array.isArray(value.data) && value.data.every(isNormalizedTicker);
  }

  return false;
}

export function useMarketSocket(): {
  tickers: TickerMap;
  status: ConnectionStatus;
  retryCount: number;
} {
  const [tickers, setTickers] = useState<TickerMap>({});
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [retryCount, setRetryCount] = useState(0);

  const socketRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const closedByUsRef = useRef(false);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    closedByUsRef.current = false;

    function clearRetryTimeout(): void {
      if (retryTimeoutRef.current !== undefined) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = undefined;
      }
    }

    function scheduleReconnect(): void {
      if (closedByUsRef.current) {
        return;
      }

      const base = Math.min(30_000, 1000 * 2 ** retryCountRef.current);
      const delay = base + Math.random() * 1000;
      retryCountRef.current += 1;
      setRetryCount(retryCountRef.current);

      clearRetryTimeout();
      retryTimeoutRef.current = setTimeout(() => {
        retryTimeoutRef.current = undefined;
        connect();
      }, delay);
    }

    function connect(): void {
      if (closedByUsRef.current) {
        return;
      }

      setStatus("connecting");

      const socket = new WebSocket(WS_URL);
      socketRef.current = socket;

      socket.onopen = () => {
        if (socketRef.current !== socket) {
          return;
        }
        retryCountRef.current = 0;
        setRetryCount(0);
        setStatus("open");
      };

      socket.onmessage = (event: MessageEvent) => {
        if (socketRef.current !== socket) {
          return;
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(String(event.data)) as unknown;
        } catch {
          return;
        }

        if (!isServerMessage(parsed)) {
          return;
        }

        if (parsed.type === "snapshot") {
          setTickers(() =>
            parsed.data.reduce<TickerMap>((map, ticker) => {
              map[ticker.symbol] = ticker;
              return map;
            }, {}),
          );
        } else if (parsed.type === "ticker") {
          const data = parsed.data;
          setTickers((prev) => ({ ...prev, [data.symbol]: data }));
        }
      };

      socket.onerror = () => {
        if (socketRef.current !== socket) {
          return;
        }
        setStatus("error");
      };

      socket.onclose = () => {
        if (socketRef.current !== socket) {
          return;
        }
        socketRef.current = null;
        setStatus("closed");
        scheduleReconnect();
      };
    }

    connect();

    return () => {
      closedByUsRef.current = true;
      clearRetryTimeout();
      const socket = socketRef.current;
      socketRef.current = null;
      socket?.close();
    };
  }, []);

  return { tickers, status, retryCount };
}
