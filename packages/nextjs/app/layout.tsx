import type { Metadata } from "next";
import { isLocalMode } from "~/lib/contracts";
import { Providers } from "./Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "DvP Settlement — scaffold-hbar-ats-dvp",
  description:
    "Bilateral delivery-versus-payment settlement on Hedera: exchange a permissioned ATS asset for an HTS payment token atomically.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        {isLocalMode && (
          <div className="bg-yellow-300 text-black text-center py-2 px-4 font-semibold text-sm">
            ⚠️ Local Mode — all data is mock/test data. Set{" "}
            <code>NEXT_PUBLIC_DVP_SETTLEMENT_ADDRESS</code> to connect to
            testnet.
          </div>
        )}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}