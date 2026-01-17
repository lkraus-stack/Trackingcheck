import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tracking Checker | Analyse von Cookie-Banner & Consent",
  description: "Überprüfen Sie Tracking-Implementierungen, Cookie-Banner und Einwilligungssignale auf Ihrer Website. DSGVO & Google Consent Mode v2 Compliance Check.",
  keywords: ["tracking", "cookie banner", "consent", "DSGVO", "GDPR", "Google Consent Mode", "TCF"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="dark">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Scroll Restoration deaktivieren - Browser soll Scroll-Position nicht wiederherstellen
              if ('scrollRestoration' in history) {
                history.scrollRestoration = 'manual';
              }
              // KEIN window.scrollTo - Seite bleibt an aktueller Position
            `,
          }}
        />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased bg-slate-950 text-slate-100 min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
