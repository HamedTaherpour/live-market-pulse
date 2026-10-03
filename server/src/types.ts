import type { WebSocket } from "ws";

export interface NormalizedTicker {
  symbol: string;
  price: string;
  change: string;
  changePercent: string;
  high: string;
  low: string;
  volume: string;
  timestamp: number;
}

export interface BinanceTickerPayload {
  E: number;
  s: string;
  p: string;
  P: string;
  c: string;
  h: string;
  l: string;
  v: string;
}

export interface BinanceStreamMessage {
  stream: string;
  data: BinanceTickerPayload;
}

export interface TickerMessage {
  type: "ticker";
  data: NormalizedTicker;
}

export interface SnapshotMessage {
  type: "snapshot";
  data: NormalizedTicker[];
}

export interface PingMessage {
  type: "ping";
}

export type ServerMessage = TickerMessage | SnapshotMessage | PingMessage;

export interface ClientSocket extends WebSocket {
  isAlive: boolean;
  heartbeatTimeout?: ReturnType<typeof setTimeout>;
}
