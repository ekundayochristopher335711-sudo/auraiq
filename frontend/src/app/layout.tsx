import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Recalro — Cognitive Mastery Engine",
  description: "Transform study materials into personalized learning systems. Predict exam readiness. Master any certification.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Recalro",
  },
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={jakarta.variable}>
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/* Apply theme before React hydrates — prevents flash */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            try {
              var s = localStorage.getItem('auraiq-theme');
              var d = window.matchMedia('(prefers-color-scheme: dark)').matches;
              if (s === 'dark' || (!s && d)) document.documentElement.classList.add('dark');
              else document.documentElement.classList.remove('dark');
            } catch(e) {
              document.documentElement.classList.add('dark');
            }
          })();
        `}} />
      </head>
      <body className="min-h-screen antialiased transition-colors duration-300">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
