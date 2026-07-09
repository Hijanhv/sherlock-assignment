import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sherlock | Candidate Identification",
  description:
    "Real-time identification of the interview candidate from fused weak signals, with a confidence score and a full explanation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
