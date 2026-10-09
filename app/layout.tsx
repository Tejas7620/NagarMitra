import type { Metadata } from "next";
import { Manrope, Inter } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NagarMitra AI — Evidence-Aware City Explorer & Route Decisions",
  description: "Mobile-first city exploration and evidence-aware route decision platform for central Pune. Report incidents and see how route recommendations adapt with transparent evidence.",
  keywords: ["NagarMitra", "Pune", "route exposure", "evidence ledger", "impact replay", "incident reporting", "smart city"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.className} ${inter.className}`}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
