import type { ConnectionStatus } from "../types.ts";

interface DisconnectedBannerProps {
  status: ConnectionStatus;
}

export function DisconnectedBanner({ status }: DisconnectedBannerProps) {
  if (status !== "closed" && status !== "error") {
    return null;
  }

  return (
    <div className="border-b border-rose-800 bg-rose-950 py-2 text-center text-sm text-rose-300">
      <div className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-rose-400 border-t-transparent" />
      Connection lost — reconnecting automatically…
    </div>
  );
}
