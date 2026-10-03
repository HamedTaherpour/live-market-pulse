import { WebSocket, WebSocketServer, type RawData } from "ws";
import type {
  BinanceStreamMessage,
  BinanceTickerPayload,
  ClientSocket,
  NormalizedTicker,
  PingMessage,
  ServerMessage,
  SnapshotMessage,
  TickerMessage,
} from "./types";

const BINANCE_URL =
  "wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/ethusdt@ticker/bnbusdt@ticker/solusdt@ticker/xrpusdt@ticker";

const PORT = Number(process.env.PORT) || 8080;
const HEARTBEAT_INTERVAL_MS = 25_000;
const HEARTBEAT_TIMEOUT_MS = 10_000;
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

const priceCache = new Map<string, NormalizedTicker>();

let binanceSocket: WebSocket | null = null;
let reconnectAttempt = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let intentionalClose = false;
let heartbeatTimer: ReturnType<typeof setInterval> | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isBinanceStreamMessage(value: unknown): value is BinanceStreamMessage {
  if (!isRecord(value) || typeof value.stream !== "string" || !isRecord(value.data)) {
    return false;
  }

  const data = value.data;
  return (
    typeof data.E === "number" &&
    typeof data.s === "string" &&
    typeof data.p === "string" &&
    typeof data.P === "string" &&
    typeof data.c === "string" &&
    typeof data.h === "string" &&
    typeof data.l === "string" &&
    typeof data.v === "string"
  );
}

function normalizeTicker(data: BinanceTickerPayload): NormalizedTicker {
  return {
    symbol: data.s,
    price: data.c,
    change: data.p,
    changePercent: data.P,
    high: data.h,
    low: data.l,
    volume: data.v,
    timestamp: data.E,
  };
}

function rawDataToString(raw: RawData): string {
  if (typeof raw === "string") {
    return raw;
  }
  if (Buffer.isBuffer(raw)) {
    return raw.toString("utf8");
  }
  if (Array.isArray(raw)) {
    return Buffer.concat(raw).toString("utf8");
  }
  return Buffer.from(raw).toString("utf8");
}

function parseJson(text: string): unknown {
  return JSON.parse(text) as unknown;
}

function send(socket: WebSocket, message: ServerMessage): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

const clientServer = new WebSocketServer({ port: PORT }, () => {
  console.log(`[server] listening on ws://localhost:${PORT}`);
});

function broadcast(message: ServerMessage): void {
  const payload = JSON.stringify(message);
  for (const client of clientServer.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

// ---------------------------------------------------------------------------
// Binance connection
// ---------------------------------------------------------------------------

function handleBinanceMessage(raw: RawData): void {
  let parsed: unknown;
  try {
    parsed = parseJson(rawDataToString(raw));
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error(`[binance] invalid JSON: ${message}`);
    return;
  }

  if (!isBinanceStreamMessage(parsed)) {
    return;
  }

  const ticker = normalizeTicker(parsed.data);
  priceCache.set(ticker.symbol, ticker);

  const message: TickerMessage = { type: "ticker", data: ticker };
  console.log(`[binance] ${ticker.symbol} price=${ticker.price} change=${ticker.changePercent}%`);
  broadcast(message);
}

function scheduleReconnect(): void {
  if (intentionalClose) {
    return;
  }

  const backoff = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempt, RECONNECT_MAX_MS);
  const delay = backoff + Math.random() * 1000;
  reconnectAttempt += 1;

  console.log(`[binance] reconnecting in ${Math.round(delay)}ms`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = undefined;
    connectBinance();
  }, delay);
}

function connectBinance(): void {
  if (intentionalClose) {
    return;
  }

  const socket = new WebSocket(BINANCE_URL);
  binanceSocket = socket;
  console.log("[binance] connecting");

  socket.on("open", () => {
    if (binanceSocket !== socket) {
      return;
    }
    reconnectAttempt = 0;
    console.log("[binance] connected");
  });

  socket.on("message", (raw: RawData) => {
    if (binanceSocket !== socket) {
      return;
    }
    handleBinanceMessage(raw);
  });

  socket.on("close", () => {
    if (binanceSocket !== socket) {
      return;
    }
    console.log("[binance] connection closed");
    binanceSocket = null;
    scheduleReconnect();
  });

  socket.on("error", (error: Error) => {
    console.error(`[binance] error: ${error.message}`);
  });
}

// ---------------------------------------------------------------------------
// Client WebSocket server
// ---------------------------------------------------------------------------

clientServer.on("connection", (socket: WebSocket) => {
  const client = socket as ClientSocket;
  client.isAlive = true;
  console.log("[client] connected");

  const snapshot: SnapshotMessage = {
    type: "snapshot",
    data: [...priceCache.values()],
  };
  send(client, snapshot);

  client.on("pong", () => {
    client.isAlive = true;
    if (client.heartbeatTimeout) {
      clearTimeout(client.heartbeatTimeout);
      client.heartbeatTimeout = undefined;
    }
  });

  client.on("close", () => {
    if (client.heartbeatTimeout) {
      clearTimeout(client.heartbeatTimeout);
      client.heartbeatTimeout = undefined;
    }
    console.log("[client] disconnected");
  });

  client.on("error", (error: Error) => {
    console.error(`[client] error: ${error.message}`);
  });
});

clientServer.on("error", (error: Error) => {
  console.error(`[server] error: ${error.message}`);
});

// ---------------------------------------------------------------------------
// Heartbeat
// ---------------------------------------------------------------------------

function startHeartbeat(): void {
  heartbeatTimer = setInterval(() => {
    for (const socket of clientServer.clients) {
      const client = socket as ClientSocket;
      if (client.readyState !== WebSocket.OPEN) {
        continue;
      }

      client.isAlive = false;
      client.ping();

      if (client.heartbeatTimeout) {
        clearTimeout(client.heartbeatTimeout);
      }

      client.heartbeatTimeout = setTimeout(() => {
        if (!client.isAlive) {
          console.log("[heartbeat] client timed out, terminating");
          client.terminate();
        }
      }, HEARTBEAT_TIMEOUT_MS);

      const ping: PingMessage = { type: "ping" };
      send(client, ping);
    }
  }, HEARTBEAT_INTERVAL_MS);
}

// ---------------------------------------------------------------------------
// Shutdown
// ---------------------------------------------------------------------------

function shutdown(signal: string): void {
  if (intentionalClose) {
    return;
  }

  intentionalClose = true;
  console.log(`[server] ${signal} received, shutting down`);

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = undefined;
  }
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = undefined;
  }

  for (const socket of clientServer.clients) {
    const client = socket as ClientSocket;
    if (client.heartbeatTimeout) {
      clearTimeout(client.heartbeatTimeout);
    }
    client.close();
  }

  binanceSocket?.close();
  clientServer.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});

connectBinance();
startHeartbeat();
