import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Invictus Sports',
  description: 'Fantasy Sports Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-900 text-white min-h-screen flex flex-col`}>
        
        {/* --- GLOBAL APP HEADER --- */}
        <nav className="bg-black/50 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
            {/* Logo / Brand Name */}
            <div className="flex items-center space-x-2">
              <span className="text-lg font-black tracking-tighter">
                <span className="text-green-400">INVICTUS</span> <span className="text-white">SPORTS</span>
              </span>
            </div>
          </div>
        </nav>

        {/* Page Content */}
        {children}
        
      </body>
    </html>
  );
}