import { PageIntro } from "~/components/ui/PageIntro";
import { Panel } from "~/components/ui/Panel";

const PIECES = [
  {
    index: "01",
    title: "On-chain order state",
    body: "Offers are created, cancelled, and filled entirely on-chain. No off-chain matching engine. No trusted intermediary. The DvPSettlement contract owns the complete lifecycle.",
  },
  {
    index: "02",
    title: "DvP settlement",
    body: "The Checks-Effects-Interactions pattern guarantees atomicity. Status is written to Filled before any transfer. If either token transfer fails, the EVM reverts — both legs or neither.",
  },
  {
    index: "03",
    title: "Hedera-native services",
    body: "The payment leg uses an HTS fungible token via the 0x167 precompile as a standard ERC-20. The asset leg uses an ATS permissioned token that enforces KYC eligibility on the buyer at transfer time.",
  },
];

const SEQUENCE = [
  "Seller creates offer specifying buyer, amounts, expiry",
  "Buyer approves payment token to DvPSettlement",
  "Buyer calls acceptOffer — CHECKS verify all conditions",
  "EFFECTS: status set to Filled before any transfer",
  "INTERACTION 1: paymentToken.transferFrom(buyer, seller)",
  "INTERACTION 2: atsAsset.transferFrom(seller, buyer)",
  "If either reverts — full rollback, no partial settlement",
];

export default function PatternPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <PageIntro
        kicker="Architecture · DvP"
        title="The settlement pattern."
        body="How delivery versus payment works on Hedera using the ATS and HTS system contracts."
      />

      {/* Three concept cards */}
      <div className="grid gap-4 sm:grid-cols-3 mb-4">
        {PIECES.map(({ index, title, body }) => (
          <Panel key={index}>
            <p className="font-mono text-[11px] text-subtle mb-2">{index}</p>
            <p
              className="text-2xl tracking-tight text-fg mb-3"
              style={{ fontFamily: "Newsreader, Georgia, serif" }}
            >
              {title}
            </p>
            <p className="text-sm text-muted leading-relaxed">{body}</p>
          </Panel>
        ))}
      </div>

      {/* Two-column detail row */}
      <div className="grid gap-4 md:grid-cols-2 mb-4">
        <Panel>
          <p className="text-[11px] uppercase tracking-[0.12em] text-subtle mb-3">
            Why ATS and HTS together
          </p>
          <div className="space-y-2 text-sm text-muted leading-relaxed">
            <p>
              HTS tokens are Hedera-native fungible tokens accessible as ERC-20
              via the precompile at{" "}
              <code className="font-mono text-[11px] text-subtle">
                0x0000…0167
              </code>
              . This makes them composable with any Solidity contract.
            </p>
            <p>
              ATS (Asset Tokenization Standard) tokens layer KYC and transfer
              restrictions on top of HTS. The KYC check happens inside{" "}
              <code className="font-mono text-[11px] text-subtle">
                transferFrom
              </code>{" "}
              — the settlement contract doesn&apos;t need to be aware of it.
            </p>
            <p>
              Together: a payment rail that works everywhere, and an asset rail
              that enforces compliance — settled atomically in one transaction.
            </p>
          </div>
        </Panel>

        <Panel>
          <p className="text-[11px] uppercase tracking-[0.12em] text-subtle mb-3">
            CEI execution sequence
          </p>
          <ol className="space-y-2">
            {SEQUENCE.map((step, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="font-mono text-[11px] text-subtle tabular shrink-0 mt-0.5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-sm text-muted">{step}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      {/* Scaffold command */}
      <Panel>
        <p className="text-[11px] uppercase tracking-[0.12em] text-subtle mb-2">
          Scaffold this project
        </p>
        <pre className="rounded-md bg-raised p-4 font-mono text-xs text-fg overflow-x-auto">
          npm create scaffold-hbar@latest -- --template De-real-iManuel/scaffold-hbar-ats-dvp
        </pre>
        <p className="mt-2 text-[11px] text-subtle">
          Creates a fully-configured DvP starter with contracts, setup scripts,
          and this frontend.
        </p>
      </Panel>
    </main>
  );
}
