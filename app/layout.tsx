import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Navbar from "./components/Navbar"; 
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Invictus Sports',
  description: 'Fantasy Sports League Manager',
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
      </body>
    </html>
  );
}