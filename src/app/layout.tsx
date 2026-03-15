import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { UserProvider } from "@/components/UserProvider";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Viral Tracker",
  description: "Finde die viralen Videos deiner Konkurrenz-Channels",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className="antialiased bg-white dark:bg-gray-950 text-gray-900 dark:text-white min-h-screen">
        <ThemeProvider>
          <UserProvider>
            <Navbar />
            {children}
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
