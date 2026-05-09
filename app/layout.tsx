import { Inter } from "next/font/google";
import "@/app/admin/globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      {/* className={inter.className} ekleyerek hydration hatasını çözüyoruz */}
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}