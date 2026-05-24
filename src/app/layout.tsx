import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import Navbar from "@/components/layout/Navbar";
import NewsTicker from "@/components/NewsTicker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <Script
        id="theme-script"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: themeScript }}
      />
      <body className="min-h-full bg-page text-primary font-sans">
        <ThemeProvider>
          <Navbar />
          {children}
          <NewsTicker />
        </ThemeProvider>
      </body>
    </html>
  );
}
