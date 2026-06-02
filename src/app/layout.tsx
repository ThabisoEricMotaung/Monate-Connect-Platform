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
  title: "Monate Vendor Network",
  description:
    "Enterprise procurement portal for suppliers, RFQs, quotes, and verification.",
};

const themeScript = `(function() {
  try {
    var stored = window.localStorage.getItem('monate-theme');
    var theme = stored === 'dark' || stored === 'light'
      ? stored
      : stored === 'auto'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
    document.documentElement.classList.add('theme-' + theme);
  } catch (e) {}
})();`;

const accessibilityScript = `(function() {
  try {
    var raw = window.localStorage.getItem('monate-accessibility');
    var prefs = raw ? JSON.parse(raw) : {};
    var root = document.documentElement;
    var fontSize = prefs.fontSize === 'large' || prefs.fontSize === 'extra-large'
      ? prefs.fontSize
      : 'normal';
    root.dataset.fontSize = fontSize;
    root.dataset.contrast = prefs.highContrast ? 'high' : 'standard';
    root.dataset.motion = prefs.reducedMotion ? 'reduced' : 'standard';
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
