"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";

interface AppHeaderProps {
  isLocalMode: boolean;
}

const NAV_LINKS = [
  { href: "/",       label: "Desk" },
  { href: "/create", label: "Create" },
  { href: "/pattern",label: "Pattern" },
];

/**
 * Global sticky header — logo + nav + wallet connect.
 * Matches the Grok design: dark glass header with hairline bottom border.
 */
export function AppHeader({ isLocalMode }: AppHeaderProps) {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="flex size-8 items-center justify-center rounded-sm bg-accent text-accent-fg text-sm font-bold select-none">
              S
            </span>
            <span
              className="text-xl text-fg"
              style={{ fontFamily: "Newsreader, Georgia, serif" }}
            >
              Settle
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {NAV_LINKS.map(({ href, label }) => {
              const active =
                href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={[
                    "rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-raised text-fg"
                      : "text-muted hover:text-fg hover:bg-raised/60",
                  ].join(" ")}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Right-side badges + wallet */}
          <div className="ml-auto flex items-center gap-2">
            {isLocalMode ? (
              <span className="hidden sm:inline-flex items-center rounded-sm px-2 py-1 text-[11px] text-warn hairline">
                Local Mode
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center rounded-sm px-2 py-1 text-[11px] text-subtle hairline">
                Hedera testnet
              </span>
            )}

            {/* RainbowKit connect button — styled minimally */}
            <div className="dvp-wallet-btn">
              <ConnectButton
                accountStatus="avatar"
                chainStatus="none"
                showBalance={false}
              />
            </div>
          </div>
        </div>

        {/* Mobile nav (horizontal scroll row) */}
        <div className="md:hidden overflow-x-auto border-t border-line">
          <div className="flex items-center gap-1 px-4 py-2">
            {NAV_LINKS.map(({ href, label }) => {
              const active =
                href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={[
                    "rounded-sm px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                    active
                      ? "bg-raised text-fg"
                      : "text-muted hover:text-fg",
                  ].join(" ")}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Local mode notice banner */}
      {isLocalMode && (
        <div className="bg-raised/80 border-b border-line px-4 py-2 text-center text-[11px] text-subtle">
          Contract addresses are using local fallbacks.{" "}
          Set{" "}
          <code className="font-mono text-muted">
            NEXT_PUBLIC_DVP_SETTLEMENT_ADDRESS
          </code>{" "}
          to connect to Hedera Testnet.
        </div>
      )}
    </>
  );
}
