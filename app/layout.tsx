import React from "react";
import { Urbanist } from "next/font/google";
import "@/app/globals.css";
import { ReduxProvider } from "@/providers/ReduxProvider";

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
        <ReduxProvider>{children}</ReduxProvider>
      </body>
    </html>
  );
}
