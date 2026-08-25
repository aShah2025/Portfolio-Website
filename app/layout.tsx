import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const SITE_URL = "https://aaditya-shah-builds.karshah133370.chatgpt.site";
const SITE_TITLE = "Aaditya Shah | iOS Developer & Student Builder";
const SITE_DESCRIPTION =
  "Aaditya Shah is a 14-year-old student builder in San Jose creating iOS apps including Kura, Wayfinder, and Refill, plus websites and learning projects.";

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ProfilePage",
      "@id": `${SITE_URL}/#profile-page`,
      url: SITE_URL,
      name: SITE_TITLE,
      description: SITE_DESCRIPTION,
      dateCreated: "2026-08-21",
      dateModified: "2026-08-24",
      inLanguage: "en-US",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      mainEntity: { "@id": `${SITE_URL}/#aaditya-shah` },
      hasPart: [
        { "@id": `${SITE_URL}/#kura` },
        { "@id": `${SITE_URL}/#wayfinder` },
        { "@id": `${SITE_URL}/#refill` },
      ],
    },
    {
      "@type": "Person",
      "@id": `${SITE_URL}/#aaditya-shah`,
      name: "Aaditya Shah",
      alternateName: "aShah2025",
      url: SITE_URL,
      description: "Student iOS app creator and web designer in San Jose.",
      homeLocation: { "@type": "City", name: "San Jose, California" },
      knowsAbout: [
        "iOS app development",
        "Product design",
        "Web design",
        "AI-assisted routing",
        "3D printing",
        "Robotics fundamentals",
      ],
      sameAs: ["https://github.com/aShah2025"],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Aaditya Shah Portfolio",
      alternateName: "Aaditya Shah",
      description: SITE_DESCRIPTION,
      inLanguage: "en-US",
      author: { "@id": `${SITE_URL}/#aaditya-shah` },
      publisher: { "@id": `${SITE_URL}/#aaditya-shah` },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#kura`,
      name: "Kura",
      operatingSystem: "iOS",
      applicationCategory: "HealthApplication",
      description: "An iOS calorie and macro tracker created for CAC 2025.",
      creator: { "@id": `${SITE_URL}/#aaditya-shah` },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#wayfinder`,
      name: "Wayfinder",
      operatingSystem: "iOS",
      applicationCategory: "NavigationApplication",
      description:
        "A customizable bike-routing iOS app with natural-language route descriptions and filters such as avoiding highways, powered by the Valhalla routing API.",
      creator: { "@id": `${SITE_URL}/#aaditya-shah` },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#refill`,
      name: "Refill",
      operatingSystem: "iOS",
      applicationCategory: "LifestyleApplication",
      description: "An iOS hydration app designed to make daily water tracking simple.",
      creator: { "@id": `${SITE_URL}/#aaditya-shah` },
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: "Aaditya Shah Portfolio",
  authors: [{ name: "Aaditya Shah", url: SITE_URL }],
  creator: "Aaditya Shah",
  publisher: "Aaditya Shah",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    type: "website",
    url: SITE_URL,
    siteName: "Aaditya Shah Portfolio",
    locale: "en_US",
    images: [
      {
        url: "/og.png",
        width: 1635,
        height: 962,
        alt: "Aaditya Shah — Builder, Designer, Engineer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
        {children}
      </body>
    </html>
  );
}
