import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anand Mohan - AI Scientist",
  description: "Professional portfolio and posts of Anand Mohan, AI Scientist at Amazon",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
