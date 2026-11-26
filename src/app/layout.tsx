import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";


export const metadata: Metadata = {
  title: "OnBlox System",
  description: "Kelola dance dan konten map Roblox kamu dari website, langsung masuk ke game.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-aurora">{children}</body>
    </html>
  );
}
