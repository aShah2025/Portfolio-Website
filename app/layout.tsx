import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aaditya Shah — Builder, Designer, Engineer",
  description: "The portfolio of Aaditya Shah, a student builder creating useful software, thoughtful products, and delightfully unusual robots.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "Aaditya Shah — Builder, Designer, Engineer",
    description: "Ideas into objects: software, products, and delightfully unusual robots.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Aaditya Shah — Builder, Designer, Engineer" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aaditya Shah — Builder, Designer, Engineer",
    description: "Ideas into objects: software, products, and delightfully unusual robots.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
