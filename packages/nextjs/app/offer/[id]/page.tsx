"use client";

import { use } from "react";
import { OfferView } from "~/components/OfferView";

export default function OfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  if (!id || isNaN(Number(id)) || Number(id) <= 0) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-red-600">Invalid offer ID: <code>{id}</code></p>
      </main>
    );
  }
  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Offer #{id}</h1>
      <OfferView offerId={BigInt(id)} />
    </main>
  );
}
