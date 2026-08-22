import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "aaditya shah — i make stuff",
  description: "apps, websites, and increasingly unnecessary robots by aaditya shah.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "aaditya shah — i make stuff",
    description: "apps, websites, and increasingly unnecessary robots.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "aaditya shah — i make stuff" }],
  },
  twitter: { card: "summary_large_image", title: "aaditya shah — i make stuff", description: "apps, websites, and increasingly unnecessary robots.", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${sans.variable} ${mono.variable}`}>{children}</body></html>;
}
