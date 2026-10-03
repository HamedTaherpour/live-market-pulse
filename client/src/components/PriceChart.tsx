import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PricePoint } from "../hooks/usePriceHistory.ts";

interface PriceChartProps {
  symbol: string;
  points: PricePoint[];
  color: string;
}

function priceTicks(points: PricePoint[]): number[] | undefined {
  if (points.length === 0) {
    return undefined;
  }

  let min = points[0]?.price ?? 0;
  let max = min;
  for (const point of points) {
    if (point.price < min) {
      min = point.price;
    }
    if (point.price > max) {
      max = point.price;
    }
  }

  if (min === max) {
    const pad = Math.abs(min) * 0.001 || 1;
    return [min - pad, min, min + pad];
  }

  return [min, (min + max) / 2, max];
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: PricePoint }>;
}) {
  if (active !== true || payload === undefined || payload.length === 0) {
    return null;
  }

  const point = payload[0]?.payload;
  if (point === undefined) {
    return null;
  }

  return (
    <div className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-white">
      <p>${point.price.toLocaleString()}</p>
      <p>{new Date(point.timestamp).toLocaleTimeString()}</p>
    </div>
  );
}

export function PriceChart({ symbol, points, color }: PriceChartProps) {
  return (
    <div className="w-full" role="img" aria-label={`${symbol} price chart`}>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="timestamp" tick={false} axisLine={false} tickLine={false} height={0} />
          <YAxis
            width="auto"
            tickCount={3}
            ticks={priceTicks(points)}
            interval={0}
            domain={["auto", "auto"]}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickFormatter={(value: number) => "$" + value.toLocaleString()}
          />
          <Tooltip
            content={<ChartTooltip />}
            isAnimationActive={false}
            wrapperStyle={{
              background: "transparent",
              border: "none",
              padding: 0,
              outline: "none",
            }}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={2}
            fill="url(#priceGradient)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
