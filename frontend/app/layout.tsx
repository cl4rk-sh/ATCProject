import "@/styles/globals.css";
import "react-h5-audio-player/lib/styles.css";
import { Metadata } from "next";
import clsx from "clsx";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "ATCProject",
  description: "ATC context query UI",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="en">
      <head />
      <body className={clsx("min-h-screen bg-background text-foreground")}>
        <Providers themeProps={{ attribute: "class", defaultTheme: "dark" }}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
