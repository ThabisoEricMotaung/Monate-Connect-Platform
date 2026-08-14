import type { Metadata } from "next";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Libre_Franklin, Playfair_Display } from "next/font/google";
import "../globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

// Critical path font: UI interactions
const libreFranklin = Libre_Franklin({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
});

// Display font: Hero headings
const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  preload: true,
});

const themeScript = `(function() {
  try {
    window.localStorage.setItem('mc-theme', 'light');
    document.documentElement.classList.remove('theme-dark');
    document.documentElement.classList.add('theme-light');
    document.documentElement.setAttribute('data-theme', 'light');
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

export const metadata: Metadata = {
  metadataBase: new URL("https://www.aiformprocure.co.za"),
  title: "Insights - AiForm Procure",
  description: "Procurement guides, compliance resources, and industry insights for South Africa",
};

export default async function InsightsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);

  return (
    <html
      lang={locale}
      data-font-size="normal"
      data-contrast="standard"
      data-motion="standard"
      data-reading-mode="off"
      data-low-data="off"
      suppressHydrationWarning
      className={`${playfair.variable} ${libreFranklin.variable} h-full antialiased`}
    >
      <head>
        <Script
          id="theme-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        <Script
          id="accessibility-script"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{ __html: accessibilityScript }}
        />
      </head>
      <body className="min-h-full bg-page text-primary font-sans">
        <ThemeProvider>
          <NextIntlClientProvider locale={locale} messages={messages} timeZone="Africa/Johannesburg">
            {children}
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
