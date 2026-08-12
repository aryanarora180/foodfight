import type { Metadata } from "next";
import { Bungee, Baloo_2 } from "next/font/google";
import "./globals.css";

const bungee = Bungee({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const baloo = Baloo_2({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Food Fight 🎰",
  description: "lay the foundation, rank the field, let the machine crown a winner.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${bungee.variable} ${baloo.variable} antialiased`}>{children}</body>
    </html>
  );
}
