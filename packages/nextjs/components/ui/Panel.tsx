import { type ReactNode } from "react";

interface PanelProps {
  children: ReactNode;
  /** When false, padding is removed so children can fill edge-to-edge */
  padded?: boolean;
  className?: string;
}

/**
 * Standard card container matching the Grok design system.
 * Dark surface + hairline border glow.
 */
export function Panel({ children, padded = true, className = "" }: PanelProps) {
  return (
    <div
      className={[
        "rounded-xl bg-surface hairline",
        padded ? "p-4 sm:p-5" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
