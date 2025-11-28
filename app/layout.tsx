import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/components/providers/QueryProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import ProviderReducer from "@/components/providers/ProviderReducer";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SENAI Gestão de Atestados",
  description: "Gerencie atestados de forma eficiente e organizada.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
      >
        <ProviderReducer providers={[QueryProvider, TooltipProvider]}>
          {children}
        </ProviderReducer>
        <Toaster />
        <Sonner />
      </body>
    </html>
  );
}
