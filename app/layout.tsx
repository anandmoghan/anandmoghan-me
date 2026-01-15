import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import GoogleAnalytics from "./components/GoogleAnalytics";
import RedirectTracker from "./components/RedirectTracker";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://anandmoghan.me';
const gaId = process.env.NEXT_PUBLIC_GA_ID || 'G-4BFLN7Y3SY';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Anand Mohan | Amazon AGI",
    template: "%s | Anand Mohan"
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  description: "Anand Mohan is an Applied Scientist at Amazon AGI specializing in Speech-to-Speech LLMs, incremental learning, and multilingual speech recognition. M.Tech from Indian Institute of Science (IISc), B.Tech from NIT Calicut (NITC). Based in United Kingdom. Expert in AI, machine learning, and ASR systems with 6+ publications in ICASSP and INTERSPEECH.",
  keywords: [
    "Anand Mohan",
    "Anand Mohan Amazon",
    "Anand Mohan AI",
    "Anand Mohan IISc",
    "Anand Mohan Indian Institute of Science",
    "Anand Mohan NITC",
    "Anand Mohan NIT Calicut",
    "Anand Mohan UK",
    "Anand Mohan United Kingdom",
    "Anand Mohan Cambridge",
    "Amazon AGI",
    "Applied Scientist Amazon",
    "Speech-to-Speech LLM",
    "AI Scientist",
    "Machine Learning Expert",
    "Speech Recognition",
    "ASR Systems",
    "Federated Learning",
    "ICASSP",
    "INTERSPEECH",
    "Indian Institute of Science",
    "AI Research",
    "Multilingual Speech Recognition",
    "Incremental Learning"
  ],
  authors: [{ name: "Anand Mohan" }],
  creator: "Anand Mohan",
  publisher: "Anand Mohan",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://anandmoghan.me",
    siteName: "Anand Mohan",
    title: "Anand Mohan - Applied Scientist at Amazon AGI",
    description: "Applied Scientist at Amazon AGI specializing in Speech-to-Speech LLMs and AI research. M.Tech from IISc Bangalore, B.Tech from NIT Calicut. Based in United Kingdom. Expert in speech recognition, machine learning, and federated learning.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Anand Mohan - AI Scientist at Amazon AGI"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Anand Mohan - Applied Scientist at Amazon AGI",
    description: "Applied Scientist at Amazon AGI specializing in Speech-to-Speech LLMs and AI research",
    images: ["/og-image.png"]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  },
  verification: {
    google: "your-google-verification-code-here"
  },
  alternates: {
    canonical: "https://anandmoghan.me"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Prevent horizontal scroll on mobile
              if (typeof window !== 'undefined') {
                let scrollTimeout;
                window.addEventListener('scroll', function() {
                  if (window.scrollX !== 0) {
                    clearTimeout(scrollTimeout);
                    scrollTimeout = setTimeout(function() {
                      window.scrollTo(0, window.scrollY);
                    }, 10);
                  }
                }, { passive: true });
              }
            `
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Person",
              name: "Anand Mohan",
              jobTitle: "Applied Scientist",
              worksFor: {
                "@type": "Organization",
                name: "Amazon AGI"
              },
              alumniOf: [
                {
                  "@type": "EducationalOrganization",
                  name: "Indian Institute of Science",
                  alternateName: "IISc Bangalore",
                  location: "Bangalore, India"
                },
                {
                  "@type": "EducationalOrganization",
                  name: "National Institute of Technology Calicut",
                  alternateName: "NIT Calicut, NITC",
                  location: "Calicut, India"
                }
              ],
              address: {
                "@type": "PostalAddress",
                addressCountry: "United Kingdom",
                addressRegion: "England"
              },
              knowsAbout: [
                "Artificial Intelligence",
                "Machine Learning",
                "Speech Recognition",
                "Speech-to-Speech LLMs",
                "Federated Learning",
                "Natural Language Processing",
                "Deep Learning",
                "ASR Systems"
              ],
              sameAs: [
                "https://linkedin.com/in/anandmoghan",
                "https://scholar.google.com/citations?user=D1KIt3cAAAAJ&hl=en"
              ],
              url: "https://anandmoghan.me",
              description: "Applied Scientist at Amazon AGI specializing in Speech-to-Speech LLMs, incremental learning, and multilingual speech recognition"
            })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Anand Mohan",
              alternateName: "Anand Mohan | Applied Scientist at Amazon AGI",
              url: "https://anandmoghan.me",
              description: "Personal website and blog of Anand Mohan, Applied Scientist at Amazon AGI",
              author: {
                "@type": "Person",
                name: "Anand Mohan"
              }
            })
          }}
        />
      </head>
      <body className="antialiased">
        {gaId && <GoogleAnalytics gaId={gaId} />}
        <Suspense fallback={null}>
          <RedirectTracker />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
