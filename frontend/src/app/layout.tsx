import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "AuraIQ — Cognitive Mastery Engine",
  description: "Transform study materials into personalized learning systems. Predict exam readiness. Master any certification.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Prevent FOUC: apply theme class before React hydrates */}
      <head>
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
      <body className="bg-[#0a0a0a] text-white min-h-screen antialiased transition-colors duration-300">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
