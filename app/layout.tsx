import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SplashScreen } from "@/components/SplashScreen";
import "./globals.css";

export const metadata: Metadata = {
  title: "NARLA — Apartment Co-Pilot",
  description:
    "The AI-powered apartment co-pilot for roommates and shared households.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <ClerkProvider>
            <ConvexClientProvider>
              <SplashScreen />
              {children}
            </ConvexClientProvider>
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
