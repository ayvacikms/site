"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Lock, Mail, User, Phone, ArrowRight, ShieldCheck, Motorbike } from "lucide-react";
import { Play } from "next/font/google";

// Hatanın çözümü için "export default" olarak tanımlıyoruz
export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    adSoyad: "",
    telefon: ""
  });

  const handleAction = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  if (isLogin) {
    // GİRİŞ YAPMA İŞLEMİ
    const { error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });

    if (error) {
      alert("Giriş hatası: " + error.message);
    } else {
      router.push("/uye-paneli");
    }
 // ... önceki kodlar
} else {
  // KAYIT OLMA İŞLEMİ
  
  
const { data, error: authError } = await supabase.auth.signUp({
  email: formData.email,
  password: formData.password,
  options: {
    data: {
      full_name: formData.adSoyad,
      display_name: formData.adSoyad,
      phone: formData.telefon,     // SQL'deki ->>'phone' için
      telefon: formData.telefon,   // SQL'deki ->>'telefon' için
    }
  }
});


  if (authError) {
    alert("Kayıt hatası: " + authError.message);
  } else if (data.user) {
    // Manuel insert işlemini sildiğinizden emin olun, sadece uyarı verin.
    alert("Başvurunuz başarıyla alındı! Yönetici onayından sonra giriş yapabilirsiniz.");
    setIsLogin(true);
  }
}
// ... devamı
  setLoading(false);
};

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center p-4 font-sans text-gray-800">
      <div className="max-w-[1000px] w-full bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        
        {/* SOL PANEL: TASARIM VE MESAJ */}
        <div className="md:w-1/2 bg-[#1eb3a4] p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-8">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <Motorbike size={28} className="text-white" />
              </div>
              <span className="font-black text-2x2 tracking-tighter italic uppercase">AYVACIK MOTOR SPORLARI</span>
              <span className="font-black text-2x2 tracking-tighter italic uppercase">KULÜP PORTALI</span>
            </div>
            <h1 className="text-4xl font-black leading-tight mb-4 uppercase italic tracking-tighter">
              {isLogin ? "Tekrar Hoş Geldiniz!" : "Kulübümüze Katılın"}
            </h1>
            <p className="text-teal-50 font-medium opacity-80 text-sm">
              {isLogin 
                ? "Hesap dökümlerinizi, ödemelerinizi ve kulüp duyurularını tek bir panelden takip edin." 
                : "Üyelik başvurunuzu yaparak kulüp avantajlarından yararlanmaya başlayın."}
            </p>
          </div>
          
          <div className="relative z-10 bg-white/10 p-6 rounded-3xl backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-teal-200" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Güvenli Üye Altyapısı</span>
            </div>
          </div>

          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        </div>

        {/* SAĞ PANEL: FORM ALANI */}
        <div className="md:w-1/2 p-12 flex flex-col justify-center">
          <div className="mb-10 text-center md:text-left">
            <h2 className="text-2xl font-black text-gray-800 uppercase italic tracking-tighter">
              {isLogin ? "ÜYE GİRİŞİ" : "YENİ ÜYE BAŞVURUSU"}
            </h2>
            <p className="text-gray-400 text-xs font-bold mt-1 uppercase tracking-wider">
              {isLogin ? "Bilgilerinizle giriş yapın" : "Onaylı üyelik için formu doldurun"}
            </p>
          </div>

          <form onSubmit={handleAction} className="space-y-4">
            {!isLogin && (
              <>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" required placeholder="Adınız Soyadınız"
                    className="w-full bg-gray-50 border-2 border-gray-100 p-4 pl-12 rounded-2xl font-bold text-sm outline-none focus:border-[#1eb3a4] transition-all"
                    onChange={(e) => setFormData({...formData, adSoyad: e.target.value})}
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="tel" required placeholder="Telefon Numaranız"
                    className="w-full bg-gray-50 border-2 border-gray-100 p-4 pl-12 rounded-2xl font-bold text-sm outline-none focus:border-[#1eb3a4] transition-all"
                    onChange={(e) => setFormData({...formData, telefon: e.target.value})}
                  />
                </div>
              </>
            )}

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="email" required placeholder="E-posta Adresiniz"
                className="w-full bg-gray-50 border-2 border-gray-100 p-4 pl-12 rounded-2xl font-bold text-sm outline-none focus:border-[#1eb3a4] transition-all"
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="password" required placeholder="Şifreniz"
                className="w-full bg-gray-50 border-2 border-gray-100 p-4 pl-12 rounded-2xl font-bold text-sm outline-none focus:border-[#1eb3a4] transition-all"
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>

            <button 
              type="submit" disabled={loading}
              className="w-full bg-[#1eb3a4] text-white p-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-teal-100 hover:bg-[#189185] transition-all flex items-center justify-center gap-2 mt-4"
            >
              {loading ? "İŞLEM YAPILIYOR..." : (isLogin ? "GİRİŞ YAP" : "BAŞVURUYU TAMAMLA")}
              {!loading && <ArrowRight size={20} />}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-gray-400 font-black text-[10px] uppercase tracking-widest hover:text-[#1eb3a4] transition-colors"
            >
              {isLogin 
                ? "Henüz üye değil misiniz? Şimdi Başvurun" 
                : "Zaten üye misiniz? Giriş Yapın"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
