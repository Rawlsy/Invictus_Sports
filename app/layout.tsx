import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Navbar from "./components/Navbar"; 
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/next';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Invictus Sports',
  description: 'The premier platform for Playoff Fantasy Football. Build your dynasty, track live scores, and dominate the post-season.',
  metadataBase: new URL('https://invictussports.app'), // Your custom domain
  openGraph: {
    title: 'Invictus Sports',
    description: 'The premier platform for Playoff Fantasy Football.',
    url: 'https://invictussports.app',
    siteName: 'Invictus Sports',
    images: [
      {
        url: '/og-image.png', // This file must exist in your public/ folder
        width: 1200,
        height: 630,
        alt: 'Invictus Sports Preview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Invictus Sports',
    description: 'The premier platform for Playoff Fantasy Football.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-white min-h-screen flex flex-col font-sans overflow-x-hidden max-w-[100vw]`}>
        
        {/* --- GOOGLE ADSENSE SCRIPT --- */}
        <Script
          id="adsbygoogle-init"
          strategy="afterInteractive"
          crossOrigin="anonymous"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3903014833331900" 
        />

        <Navbar />
        
        <main className="flex-grow w-full">
            {children}
        </main>
        <Analytics />
      </body>
    </html>
  );
}