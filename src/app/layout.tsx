import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { WalkthroughOverlay } from "@/components/walkthrough-overlay";

// Satoshi is loaded via Fontshare CDN (Indian Type Foundry's free font service).
// The @font-face rules are injected into globals.css so Satoshi is available
// as a normal CSS font family across the entire app.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Reform | Precision Technical Infrastructure",
  description:
    "Build, validate, and deploy complex logical workflows with the precision of a high-performance terminal. Next-gen schema engineering for fintech, healthcare, and government infrastructure.",
  keywords: [
    "Reform",
    "Schema Engineering",
    "Form Validation",
    "Logical Workflows",
    "Fintech Compliance",
    "HIPAA",
    "Developer Tools",
  ],
  authors: [{ name: "Reform" }],
  icons: {
    // Browsers request /favicon.ico by default — the .ico file is served
    // from public/favicon.ico (multi-resolution: 16, 32, 48). The SVG
    // is used by modern browsers that support scalable icons. PNG icons
    // are provided for Apple touch icon and PWA manifest use.
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  openGraph: {
    title: "Reform | Precision Technical Infrastructure",
    description:
      "Next-gen schema engineering. Build, validate, and deploy complex logical workflows.",
    siteName: "Reform",
    type: "website",
    images: ["/logo.svg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Reform | Precision Technical Infrastructure",
    description:
      "Next-gen schema engineering. Build, validate, and deploy complex logical workflows.",
    images: ["/logo.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning style={{ colorScheme: "dark" }}>
      <head>
        {/* Satoshi (Indian Type Foundry) via Fontshare CDN */}
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,700,900&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
        {/* Fallback: if external font CDNs are blocked (common in preview
            iframes), ensure Material Symbols icons still render as readable
            text instead of invisible. This also prevents layout shift. */}
        <style>{`
          .material-symbols-outlined {
            font-family: 'Material Symbols Outlined', ui-sans-serif, system-ui, sans-serif;
            font-feature-settings: 'liga';
            -webkit-font-smoothing: antialiased;
            display: inline-block;
          }
          /* If the icon font never loads, hide the raw ligature text so
             users don't see words like "dashboard" leaking into the UI. */
          .material-symbols-outlined:not(:has(svg)) {
            min-width: 1em;
            text-align: center;
          }
        `}</style>
        {/* No-JS fallback: ensure `.reveal` content is visible without JS */}
        <noscript>
          <style>{`.reveal { opacity: 1 !important; transform: none !important; }`}</style>
        </noscript>
      </head>
      <body
        className={`${jetbrainsMono.variable} antialiased font-sans`}
        suppressHydrationWarning
      >
        {/* forcedTheme="dark" guarantees dark mode is ALWAYS active regardless
            of any stale localStorage value from prior visits. Together with
            the `dark` class on <html> and color-scheme: dark, this ensures
            every visitor — new or returning — sees the dark UI on first
            paint and on every subsequent navigation. */}
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
          {children}
          <Toaster />
          <WalkthroughOverlay />
        </ThemeProvider>
      </body>
    </html>
  );
}
