import React from "react";
import { Urbanist } from "next/font/google";
import "@/app/globals.css";
import { ReduxProvider } from "@/providers/ReduxProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { ConfirmProvider } from "@/components/ui/ConfirmProvider";

const urbanist = Urbanist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata = {
  title: "Cowshed Creators Portal",
  description: "Role-based workspace for live P&L, pipeline, rosters, and deal submissions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={urbanist.variable}>
      <body>
        <ReduxProvider>
          <ToastProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
          </ToastProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
