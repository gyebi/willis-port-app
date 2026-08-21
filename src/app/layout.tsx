import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Willis Port",
  description: "Operations dashboard for customer shipping requests.",
  icons: {
    icon: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
