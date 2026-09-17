import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://benchback-ai.web.app"),
  title: "Benchback - From parts shelf to paid back",
  description:
    "A voice-operated core-deposit recovery desk for repair shops. Match the part, prepare the return, reconcile the credit.",
  openGraph: {
    title: "Benchback - From parts shelf to paid back",
    description:
      "Recover parts-core deposits with a voice-operated return and credit workbench.",
    images: [{ url: "/benchback-cover.png", width: 1920, height: 1080 }],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
