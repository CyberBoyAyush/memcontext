import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "MemContext - Persistent Memory for AI Coding Agents",
  description:
    "Your AI assistant never forgets. MemContext gives Claude, Cursor, and Cline persistent memory across sessions. Save context once, retrieve it forever.",
  keywords: [
    "AI memory",
    "Claude",
    "Cursor",
    "Cline",
    "MCP",
    "Model Context Protocol",
    "AI coding assistant",
    "persistent memory",
  ],
  authors: [{ name: "MemContext" }],
  openGraph: {
    title: "MemContext - Persistent Memory for AI Coding Agents",
    description:
      "Your AI assistant never forgets. Save context once, retrieve it forever.",
    url: "https://memcontext.in",
    siteName: "MemContext",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MemContext - Persistent Memory for AI Coding Agents",
    description:
      "Your AI assistant never forgets. Save context once, retrieve it forever.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Script
          defer
          src="https://stats.ayush-sharma.in/script.js"
          data-website-id="ae3ef413-5642-4f0b-90d6-4d86849adf38"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
