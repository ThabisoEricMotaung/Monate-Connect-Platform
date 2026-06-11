import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { I18nProvider } from "@/lib/i18n";
import AccessibilityPanel from "@/components/AccessibilityPanel";
import Navbar from "@/components/layout/Navbar";
import NewsTicker from "@/components/NewsTicker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Monate Connect",
  description:
    "Enterprise procurement portal for suppliers, RFQs, quotes, and verification.",
};

const themeScript = `(function() {
  try {
    var h = new Date().getHours();
    var todDefault = h >= 6 && h <= 17 ? 'light' : 'dark';
    var stored = window.localStorage.getItem('mc-theme');
    if (!stored) {
      var old = window.localStorage.getItem('monate-theme') || window.localStorage.getItem('mc-pricing-theme');
      if (old === 'dark' || old === 'light') { stored = old; window.localStorage.setItem('mc-theme', stored); }
    }
    var theme = stored === 'dark' || stored === 'light'
      ? stored
      : stored === 'auto'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : todDefault;
    document.documentElement.classList.add('theme-' + theme);
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();`;

const accessibilityScript = `(function() {
  try {
    var raw = window.localStorage.getItem('monate-accessibility');
    var prefs = raw ? JSON.parse(raw) : {};
    var root = document.documentElement;
    var fontSize = prefs.fontSize === 'large' || prefs.fontSize === 'xlarge' || prefs.fontSize === 'extra-large'
      ? prefs.fontSize
      : 'normal';
    if (fontSize === 'extra-large') fontSize = 'xlarge';
    root.classList.remove('font-size-normal', 'font-size-large', 'font-size-xlarge', 'prefers-reduced-motion', 'high-contrast-mode');
    root.classList.add('font-size-' + fontSize);
    root.dataset.fontSize = fontSize;
    root.dataset.contrast = prefs.highContrast ? 'high' : 'standard';
    root.dataset.motion = prefs.reducedMotion ? 'reduced' : 'standard';
    if (prefs.highContrast) root.classList.add('high-contrast-mode');
    if (prefs.reducedMotion) root.classList.add('prefers-reduced-motion');
    root.dataset.readingMode = prefs.readingMode ? 'on' : 'off';
    root.dataset.lowData = prefs.lowData ? 'on' : 'off';
  } catch (e) {}
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-font-size="normal"
      data-contrast="standard"
      data-motion="standard"
      data-reading-mode="off"
      data-low-data="off"
      suppressHydrationWarning
      className={`${geistSans.variable} ${playfair.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=IM+Fell+English:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <Script
        id="theme-script"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: themeScript }}
      />
      <Script
        id="accessibility-script"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: accessibilityScript }}
      />
      <body className="min-h-full bg-page text-primary font-sans">
        <ThemeProvider>
          <I18nProvider>
            <Navbar />
            {children}
            <AccessibilityPanel />
            <NewsTicker />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
