import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MamaPikin Connect - SierraCare",
  description: "Maternal and Child Health Information System for Sierra Leone",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}