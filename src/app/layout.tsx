import type { Metadata } from "next";
import AppHeader from "@/components/app-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenDash",
  description: "OpenDash local MVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
