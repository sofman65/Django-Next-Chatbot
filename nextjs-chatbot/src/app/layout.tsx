import type { Metadata } from "next";
import { Inter, Orbitron, Space_Grotesk } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  subsets: ["latin"],
  variable: '--font-inter',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: '--font-space-grotesk',
});

const fontSans = Inter({
  subsets: ["latin"],
  variable: '--font-sans',
});

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ['400', '700'],
  variable: '--font-orbitron',
});

export const metadata: Metadata = {
  title: "DoChat.ai – AI-powered Team Chat that Turns Talk into Action",
  description: "DoChat.ai summarizes conversations, extracts tasks and keeps teams aligned—right inside their favourite chat tools.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar:state")?.value === "true";

  return (
    <html lang="en">
      <body className={`${inter.variable} ${orbitron.variable} ${spaceGrotesk.variable} font-sans`}>
        <AuthProvider>
          <TooltipProvider>
            <SidebarProvider defaultOpen={false}>
              {children}
            </SidebarProvider>
          </TooltipProvider>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
