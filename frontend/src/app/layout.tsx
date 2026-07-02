import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Login & Task Automation",
  description: "Create an account, save website sessions, and run automation tasks",
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
