import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aaditya Shah — Builder, Designer, Engineer",
  description: "Apps, websites, and robots built by Aaditya Shah, a 14-year-old student builder in San Jose.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "Aaditya Shah — Builder, Designer, Engineer",
    description: "Turning ideas into apps, websites, and robots.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Aaditya Shah — Builder, Designer, Engineer" }],
  },
  twitter: { card: "summary_large_image", title: "Aaditya Shah — Builder, Designer, Engineer", description: "Turning ideas into apps, websites, and robots.", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${sans.variable} ${mono.variable}`}>{children}</body></html>;
}
