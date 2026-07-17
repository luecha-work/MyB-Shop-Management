import type { Metadata, Viewport } from "next";
import { Manrope, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "thai"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "My.B POS & Inventory",
  description: "Admin Management System",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${manrope.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <style>{`
          .material-symbols-outlined {
            font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24;
          }
          .material-symbols-outlined.filled {
            font-variation-settings: "FILL" 1, "wght" 400, "GRAD" 0, "opsz" 24;
          }
        `}</style>
      </head>
      <body className="bg-background text-on-background font-body-md h-screen flex flex-col overflow-hidden pb-nav lg:pb-0">
        {children}
      </body>
    </html>
  );
}
