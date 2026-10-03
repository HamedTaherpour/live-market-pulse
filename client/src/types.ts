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

export type ServerMessage =
  | { type: "snapshot"; data: NormalizedTicker[] }
  | { type: "ticker"; data: NormalizedTicker }
  | { type: "ping" };

export type ConnectionStatus = "connecting" | "open" | "closed" | "error";

export type TickerMap = Record<string, NormalizedTicker>;
