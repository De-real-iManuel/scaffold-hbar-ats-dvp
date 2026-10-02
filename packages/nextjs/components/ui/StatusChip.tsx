/**
 * DvP offer status pill badge.
 * Maps numeric on-chain OfferStatus (0=Open,1=Filled,2=Cancelled) to labelled pill.
 */

interface StatusChipProps {
  status: number;
  expired?: boolean;
}

const configs: Record<
  string,
  { label: string; classes: string }
> = {
  open:      { label: "Open",      classes: "bg-accent/12 text-fg" },
  filled:    { label: "Settled",   classes: "bg-success/15 text-success" },
  cancelled: { label: "Cancelled", classes: "bg-raised text-muted" },
  expired:   { label: "Expired",   classes: "bg-danger/15 text-danger" },
  unknown:   { label: "Unknown",   classes: "bg-raised text-muted" },
};

function getKey(status: number, expired: boolean): string {
  if (status === 0 && expired) return "expired";
  if (status === 0) return "open";
  if (status === 1) return "filled";
  if (status === 2) return "cancelled";
  return "unknown";
}

export function StatusChip({ status, expired = false }: StatusChipProps) {
  const key = getKey(status, expired);
  const { label, classes } = configs[key];
  return (
    <span
      className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-medium tracking-wide ${classes}`}
    >
      {label}
    </span>
  );
}
