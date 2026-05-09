// app/page.tsx (Ana Sayfa Özeti)
import Link from 'next/link'
import Image from 'next/image'
import logo from "@/resim/ayvacikms.png";
export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
      <div>
        <Image 
          src={logo} 
          alt="Ayvacık Motor Sporları Logosu"
          priority // Logonun hızlı yüklenmesi için önemli
          className="object-contain"
         width={500} height={500} />
      </div>
      <h1 className="text-3xl font-black text-slate-800 uppercase">AYVACIK MOTOR SPORLARI KULUBÜ YÖNETİMİ</h1>
      <div className="flex gap-4">
        <Link href="/login" className="bg-[#4FBCA1] text-white px-8 py-3 rounded-2xl font-bold uppercase text-sm shadow-xl">
          Giriş Yap
        </Link>
        <Link href="/register" className="bg-white text-slate-600 border border-slate-200 px-8 py-3 rounded-2xl font-bold uppercase text-sm">
          Kayıt Ol
        </Link>
      </div>
    </div>
  )
}