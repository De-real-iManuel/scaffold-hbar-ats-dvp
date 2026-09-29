import { isLocalMode } from "~/lib/contracts";
import { TokenBalances } from "~/components/TokenBalances";
import { CreateOfferForm } from "~/components/CreateOfferForm";

export default function HomePage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">DvP Settlement</h1>
      <p className="text-gray-600 mb-6">
        Exchange a permissioned ATS asset for an HTS payment token — atomically.
      </p>

      {isLocalMode && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-6 text-sm text-yellow-800">
          <strong>Local Mode:</strong> No testnet environment variables are set.
          Contract addresses are mock/test doubles. Set{" "}
          <code className="bg-yellow-100 px-1 rounded">
            NEXT_PUBLIC_DVP_SETTLEMENT_ADDRESS
          </code>{" "}
          to connect to Hedera Testnet.
        </div>
      )}

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Token Balances</h2>
        <TokenBalances />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Create Offer</h2>
        <CreateOfferForm />
      </section>
    </main>
  );
}