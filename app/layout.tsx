import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BayQueue",
  description: "Car wash and lube bay queue, payments, receipts, and loyalty for Ghanaian gas stations."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
