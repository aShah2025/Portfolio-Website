import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const SITE_URL = "https://aaditya-builds.vercel.app";
const SITE_TITLE = "Aaditya Shah | Apps, Games & Experiments";
const SITE_DESCRIPTION =
  "Aaditya Shah is a high-school student in San Jose building iOS and Mac apps, arcade and 3D racing games, websites, and hands-on experiments.";

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
      dateModified: "2026-09-28",
      inLanguage: "en-US",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      mainEntity: { "@id": `${SITE_URL}/#aaditya-shah` },
      hasPart: [
        { "@id": `${SITE_URL}/#kura` },
        { "@id": `${SITE_URL}/#wayfinder` },
        { "@id": `${SITE_URL}/#refill` },
        { "@id": `${SITE_URL}/#turbo-lane` },
        { "@id": `${SITE_URL}/#formula-racer` },
        { "@id": `${SITE_URL}/#winglab` },
      ],
    },
    {
      "@type": "Person",
      "@id": `${SITE_URL}/#aaditya-shah`,
      name: "Aaditya Shah",
      alternateName: "aShah2025",
      url: SITE_URL,
      description: "Student app developer, game creator, and web designer in San Jose.",
      homeLocation: { "@type": "City", name: "San Jose, California" },
      knowsAbout: [
        "iOS app development",
        "Product design",
        "Web design",
        "Game development",
        "Aerodynamics simulation",
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
      description: "An iOS resource network that helps teachers find nearby classroom supplies.",
      creator: { "@id": `${SITE_URL}/#aaditya-shah` },
    },
    {
      "@type": "VideoGame",
      "@id": `${SITE_URL}/#turbo-lane`,
      name: "Turbo Lane",
      genre: ["Arcade", "Racing"],
      description: "A vertical arcade racing game focused on dodging traffic and chasing high scores.",
      creator: { "@id": `${SITE_URL}/#aaditya-shah` },
    },
    {
      "@type": "VideoGame",
      "@id": `${SITE_URL}/#formula-racer`,
      name: "Formula Racer",
      genre: ["3D", "Racing"],
      description: "A 3D racing game currently in development, loosely inspired by Formula 1 games.",
      creator: { "@id": `${SITE_URL}/#aaditya-shah` },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#winglab`,
      name: "WingLab",
      operatingSystem: "macOS",
      applicationCategory: "EducationalApplication",
      description: "A Mac physics simulator and aerodynamics tester for exploring wings, airflow, lift, and drag.",
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
        url: "/og.jpg",
        width: 1200,
        height: 800,
        alt: "Aaditya Shah — Builder, Designer, Engineer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og.jpg"],
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
