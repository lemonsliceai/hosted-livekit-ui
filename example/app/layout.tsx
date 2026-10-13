import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@lemonslice/hosted-call/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "LemonSlice call — dev harness",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
