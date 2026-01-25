import Navbar from "./components/Navbar"; 
import "./globals.css";

export const metadata = {
  title: "Invictus Sports",
  description: "Playoff Fantasy Challenge",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* ADDED: 'overflow-x-hidden' and 'max-w-[100vw]' 
         This stops the horizontal scroll bar on mobile without affecting desktop.
      */}
      <body className="bg-gray-950 text-white min-h-screen flex flex-col font-sans overflow-x-hidden max-w-[100vw]">
        <Navbar />
        <main className="flex-grow w-full">
            {children}
        </main>
      </body>
    </html>
  );
}