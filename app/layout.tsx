import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
