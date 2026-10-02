import Link from "next/link";
import { PageIntro } from "~/components/ui/PageIntro";
import { Panel } from "~/components/ui/Panel";
import { DashboardClient, DashboardPositions } from "~/components/DashboardClient";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <PageIntro
        kicker="ATS · DvP · Hedera"
        title="Delivery versus payment, atomically."
        body="Exchange a permissioned ATS asset for an HTS payment token in a single atomic transaction. Both legs settle — or neither does."
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/offer/1"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-raised px-4 text-sm font-medium text-fg hairline hairline-hover hover:bg-surface transition-colors"
            >
              View offer #1
            </Link>
            <Link
              href="/create"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-accent px-4 text-sm font-medium text-accent-fg hover:bg-fg transition-colors"
            >
              Create offer
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.9fr)]">
        {/* ── Left column ── */}
        <div className="space-y-4">
          {/* Offer lookup + wallet state */}
          <DashboardClient />

          {/* Protocol stat cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Panel>
              <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">
                Order state
              </p>
              <p
                className="mt-1 text-2xl tracking-tight text-fg"
                style={{ fontFamily: "Newsreader, Georgia, serif" }}
              >
                On-chain
              </p>
              <p className="mt-1 text-xs text-muted">
                createOffer · cancel · accept
              </p>
            </Panel>

            <Panel>
              <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">
                Settlement
              </p>
              <p
                className="mt-1 text-2xl tracking-tight text-fg"
                style={{ fontFamily: "Newsreader, Georgia, serif" }}
              >
                Atomic DvP
              </p>
              <p className="mt-1 text-xs text-muted">
                CEI · both legs or none
              </p>
            </Panel>

            <Panel>
              <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">
                Native services
              </p>
              <p
                className="mt-1 text-2xl tracking-tight text-fg"
                style={{ fontFamily: "Newsreader, Georgia, serif" }}
              >
                HTS + ATS
              </p>
              <p className="mt-1 text-xs text-muted">
                Payment · permissioned asset
              </p>
            </Panel>
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-4">
          {/* Positions panel — real wallet balances */}
          <Panel>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-fg">Positions</p>
              <p className="text-[11px] text-subtle">ATS · HTS</p>
            </div>
            <DashboardPositions />
          </Panel>

          {/* Token pair card */}
          <Panel>
            <p className="text-[11px] uppercase tracking-[0.12em] text-subtle mb-3">
              Settlement pair
            </p>
            <div className="space-y-1">
              <div className="flex items-center justify-between rounded-md bg-raised px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-fg">ATS Token</p>
                  <p className="text-[11px] text-subtle">
                    ATS security · ERC-1400 / ATS
                  </p>
                </div>
                <span className="text-[11px] font-mono text-subtle">ASSET</span>
              </div>

              <div className="flex items-center gap-2 py-1">
                <div className="h-px flex-1 bg-line" />
                <span className="text-[11px] text-subtle">versus</span>
                <div className="h-px flex-1 bg-line" />
              </div>

              <div className="flex items-center justify-between rounded-md bg-raised px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-fg">Payment Token</p>
                  <p className="text-[11px] text-subtle">
                    HTS fungible · precompile
                  </p>
                </div>
                <span className="text-[11px] font-mono text-subtle">
                  PAYMENT
                </span>
              </div>
            </div>
          </Panel>

          {/* Settlement sequence */}
          <Panel>
            <p className="text-[11px] uppercase tracking-[0.12em] text-subtle mb-3">
              Settlement sequence
            </p>
            <ol className="space-y-2">
              {[
                "Seller calls createOffer",
                "Buyer approves payment token",
                "Buyer calls acceptOffer",
                "Contract verifies checks (CEI)",
                "Payment transferred buyer → seller",
                "Asset transferred seller → buyer",
                "OfferSettled event emitted",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="font-mono text-[11px] text-subtle tabular shrink-0 mt-0.5">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-muted">{step}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </main>
  );
}
