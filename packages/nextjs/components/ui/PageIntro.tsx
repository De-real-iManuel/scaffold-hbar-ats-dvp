import { type ReactNode } from "react";

interface PageIntroProps {
  kicker: string;
  title: string;
  body?: string;
  /** Optional action area rendered on the right on desktop */
  action?: ReactNode;
}

/**
 * Consistent page header used on every route:
 * kicker (11px uppercase) + serif h1 + muted body + optional action
 */
export function PageIntro({ kicker, title, body, action }: PageIntroProps) {
  return (
    <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2 max-w-xl">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-subtle">
          {kicker}
        </p>
        <h1
          className="font-display text-[2rem] sm:text-5xl leading-[1.12] tracking-tight text-fg"
          style={{ fontFamily: "Newsreader, Georgia, serif" }}
        >
          {title}
        </h1>
        {body && (
          <p className="text-sm text-muted leading-relaxed">{body}</p>
        )}
      </div>
      {action && (
        <div className="flex items-center gap-2 shrink-0">{action}</div>
      )}
    </div>
  );
}
