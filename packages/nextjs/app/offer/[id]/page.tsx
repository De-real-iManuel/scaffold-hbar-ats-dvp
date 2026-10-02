"use client";

import { use } from "react";
import Link from "next/link";
import { PageIntro } from "~/components/ui/PageIntro";
import { OfferView } from "~/components/OfferView";

export default function OfferPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  if (!id || isNaN(Number(id)) || Number(id) <= 0) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="rounded-xl bg-surface hairline p-5">
          <p className="text-sm text-danger">
            Invalid offer ID:{" "}
            <code className="font-mono">{id ?? "(empty)"}</code>
          </p>
          <Link
            href="/"
            className="mt-3 inline-block text-sm text-muted underline hover:text-fg transition-colors"
          >
            ← Back to desk
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <PageIntro
        kicker={`Offer #${id}`}
        title="Delivery versus Payment"
        body="Review the terms, check advisory conditions, and execute the atomic DvP settlement below."
        action={
          <Link
            href="/"
            className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-raised px-3 text-xs font-medium text-muted hairline hairline-hover hover:text-fg transition-colors"
          >
            ← Desk
          </Link>
        }
      />
      <OfferView offerId={BigInt(id)} />
    </main>
  );
}
