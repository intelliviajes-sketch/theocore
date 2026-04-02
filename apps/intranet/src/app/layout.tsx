import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Providers from "./providers";
import { resolveTenantFromRequest } from "@/lib/tenant/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TheoCore",
  description: "Plataforma operativa multiagencia impulsada por IA.",
};

const THEME_BOOTSTRAP_SCRIPT = `
  (function () {
    try {
      var key = "theocore_theme";
      var saved = window.localStorage.getItem(key);
      var mode = saved === "light" || saved === "dark" ? saved : "dark";
      var root = document.documentElement;
      root.classList.toggle("dark", mode === "dark");
      root.setAttribute("data-theme", mode);
    } catch (_) {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    }
  })();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const tenant = await resolveTenantFromRequest();
  const language = tenant.market?.languageCode?.slice(0, 2) || "es";
  const bodyClassName = `${geistSans.variable} ${geistMono.variable} antialiased`;
  const dataTenant = tenant.kind === "agency" ? tenant.agency?.id ?? "agency" : "platform";

  return (
    <html
      lang={language}
      suppressHydrationWarning
      data-tenant-kind={tenant.kind}
      data-tenant-host={tenant.normalizedHost || "platform"}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body className={bodyClassName} data-tenant={dataTenant}>
        <Providers tenant={tenant}>{children}</Providers>
      </body>
    </html>
  );
}
