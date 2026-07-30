import type { Metadata, Viewport } from "next";
import "./globals.css";
import TabBar from "@/components/TabBar";
import PwaSetup from "@/components/PwaSetup";

export const metadata: Metadata = {
  title: "Dolly OS",
  description: "One thing. The floor. The room.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Dolly OS",
  },
  icons: { apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#faf9f7",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <PwaSetup />
        <main className="mx-auto max-w-md px-5 pb-28 pt-8 min-h-screen">
          {children}
        </main>
        <TabBar />
      </body>
    </html>
  );
}
