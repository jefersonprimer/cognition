import "./globals.css";
import "katex/dist/katex.min.css";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { LayoutProvider } from "@/context/LayoutContext";
import { FavoriteProvider } from "@/context/FavoriteContext";
import { NoteProvider } from "@/context/NoteContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nolio",
  description: "Nolio is more than just a notepad - Developed by Primer",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var theme = localStorage.getItem("Nolio-theme") || "dark";
                  var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                  var shouldUseDark = theme === "dark" || (theme === "system" && prefersDark);
                  document.documentElement.classList.toggle("dark", shouldUseDark);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider messages={messages} locale={locale}>
          <ThemeProvider>
            <AuthProvider>
              <NoteProvider>
                <FavoriteProvider>
                  <LayoutProvider>{children}</LayoutProvider>
                </FavoriteProvider>
              </NoteProvider>
            </AuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
