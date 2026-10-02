"use client";

import Link from "next/link";
import { PageIntro } from "~/components/ui/PageIntro";
import { Panel } from "~/components/ui/Panel";
import { CreateOfferForm } from "~/components/CreateOfferForm";

export default function CreatePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <PageIntro
        kicker="Seller desk"
        title="Post a bilateral offer."
        body="Specify the buyer, asset amount, payment amount, and offer expiry. The buyer must approve the payment token before accepting."
        action={
          <Link
            href="/"
            className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-raised px-3 text-xs font-medium text-muted hairline hairline-hover hover:text-fg transition-colors"
          >
            ← Desk
          </Link>
        }
      />

      <div className="mx-auto max-w-xl">
        <Panel>
          <CreateOfferForm />
        </Panel>

        {/* Contextual explanation */}
        <div className="mt-4 space-y-3">
          <Panel>
            <p className="text-[11px] uppercase tracking-[0.12em] text-subtle mb-2">
              After creating
            </p>
            <ol className="space-y-2">
              {[
                "Note the offer ID from the OfferCreated event on HashScan",
                "Share /offer/[id] with the buyer",
                "Buyer approves the exact payment amount on the offer page",
                "Buyer accepts — both legs settle atomically",
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
