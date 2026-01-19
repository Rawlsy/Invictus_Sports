import Navbar from "./components/Navbar"; // Ensure this matches the folder you create
import "./globals.css";

export const metadata = {
  title: "Invictus Sports",
  description: "Playoff Fantasy Challenge",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white min-h-screen flex flex-col font-sans">
        <Navbar />
        <main className="flex-grow">{children}</main>
      </body>
    </html>
  );
}