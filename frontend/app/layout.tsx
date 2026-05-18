import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import GlobalLayout from "./components/GlobalLayout"; // 1. Import our custom split-screen layout
import "./globals.css";
import styles from "./layout.module.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DRIPTEA - offical website-DRIPTEA",
  description: "A premium bubble tea ordering experience",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      {/* 2. Added margin: 0 and padding: 0 so the split-screen completely fills the browser */}
      <body style={{ margin: 0, padding: 0 }}>
        
        {/* 3. Wrap everything in the GlobalLayout so the AI chatbot is available on EVERY page! */}
        <GlobalLayout>
          <div className={styles.pageContainer}>
            {children}
          </div>
        </GlobalLayout>
        
      </body>
    </html>
  );
}