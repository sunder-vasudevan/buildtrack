import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/nav/BottomNav";
import { TopBar } from "@/components/nav/TopBar";
import { PrefsProvider } from "@/lib/prefs-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BuildTrack",
  description: "Farmhouse construction tracker",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PrefsProvider>
          <TopBar />
          <main className="min-h-screen pt-12 pb-20 bg-gray-50">
            {children}
          </main>
          <BottomNav />
        </PrefsProvider>
      </body>
    </html>
  );
}
