"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Search, 
  RefreshCw, 
  Info, 
  UserPlus, 
  Trash2, 
  Edit, 
  Download, 
  FileText,
  X,
  User,
  Lock
} from "lucide-react";
import Link from "next/link";

export default function UyelerPage() {
  const [uyeler, setUyeler] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUye, setEditingUye] = useState<any>(null);
  const [formData, setFormData] = useState({ ad: "", telefon: "", eposta: "", sifre: "" });

  useEffect(() => {
    fetchUyeler();
  }, []);

  const fetchUyeler = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("uyeler")
      .select("*")
      .order("ad", { ascending: true });
    if (!error) setUyeler(data || []);
    setLoading(false);
  };

  const handleOpenModal = (uye = null) => {
    if (uye) {
      setEditingUye(uye);
      setFormData({ ad: uye.ad, telefon: uye.telefon || "", eposta: uye.eposta || "", sifre: "" });
    } else {
      setEditingUye(null);
      setFormData({ ad: "", telefon: "", eposta: "", sifre: "ayvacik123" });
    }
    setIsModalOpen(true);
  };

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  if (editingUye) {
    // GÜNCELLEME (Burada değişiklik yok)
    const { error } = await supabase.from("uyeler").update({
      ad: formData.ad,
      telefon: formData.telefon,
      eposta: formData.eposta
    }).eq("id", editingUye.id);
    
    if (error) alert("Hata: " + error.message);
  } else {
    // YENİ EKLEME (SADECE AUTH)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.eposta,
      password: formData.sifre,
      options: {
        data: {
          full_name: formData.ad, // Trigger bu alanı 'raw_user_meta_data'dan okuyor
          display_name: formData.ad,
          phone:formData.telefon
        }
      }
    });

    if (authError) {
      alert("Hata: " + authError.message);
    } else {
      alert("Üye başarıyla oluşturuldu. (Trigger tarafından tabloya eklendi)");
    }
  }

  setIsModalOpen(false);
  fetchUyeler();
};

// handleRolDegistir fonksiyonunu handleSubmit'in altına ekle
const handleRolDegistir = async (id: string, yeniRol: string) => {
  const { error } = await supabase
    .from("uyeler")
    .update({ rol: yeniRol })
    .eq("id", id);

  if (error) alert("Yetki hatası: " + error.message);
  else fetchUyeler();
};

  const handleDelete = async (id: string) => {
    if (confirm("Bu üyeyi silmek istediğinize emin misiniz?")) {
      const { error } = await supabase.from("uyeler").delete().eq("id", id);
      if (error) alert("Silme hatası: " + error.message);
      else fetchUyeler();
    }
  };

  const filteredUyeler = uyeler.filter(u => u.ad.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-4 md:p-8 bg-[#f8fafb] min-h-screen font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* ÜST PANEL */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight uppercase">Yönetim / Üye Yönetimi</h1>
            <p className="text-gray-500 text-xs font-bold mt-1">Sistemdeki Toplam Üye: {uyeler.length}</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={() => handleOpenModal()}
              className="flex-1 md:flex-none bg-teal-600 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-teal-100 font-bold text-sm hover:bg-teal-700 transition-all flex items-center justify-center gap-2"
            >
              <UserPlus size={18} /> Yeni Üye Kaydı
            </button>
          </div>
        </div>

        {/* ARA PANEL */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-6 shadow-sm flex items-center gap-4">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Üye adı ile ara..." 
              className="w-full border-2 border-gray-50 bg-gray-50 rounded-xl pl-4 pr-10 py-3 text-sm focus:bg-white focus:border-teal-500 outline-none transition-all font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute right-4 top-3.5 text-gray-400" size={18} />
          </div>
          <button onClick={fetchUyeler} className="bg-indigo-600 p-3 text-white rounded-xl hover:bg-indigo-700 shadow-md transition-all">
            <RefreshCw size={20} />
          </button>
        </div>

        {/* LİSTE */}
        <div className="grid grid-cols-1 gap-4">
          {loading ? (
             <div className="text-center py-10 font-bold text-gray-400 animate-pulse">Veriler Güncelleniyor...</div>
          ) : filteredUyeler.map((uye) => (
            <div key={uye.id} className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between hover:shadow-xl hover:shadow-gray-200/50 transition-all group">
              
              <div className="flex items-center gap-5 flex-1 w-full">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-teal-600 group-hover:text-white transition-all">
                  <User size={28} />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-800 uppercase text-base">{uye.ad}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                    <p className="text-teal-600 text-xs font-black">{uye.telefon || "Tel: - "}</p>
                    <p className="text-gray-400 text-[11px] font-bold">{uye.eposta}</p>
                  </div>
                  {uye.auth_id ? (
                     <span className="inline-block mt-2 text-[9px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">Sistem Bağlı</span>

                    

                  ) : (
                    <span className="inline-block mt-2 text-[9px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">Sistem Bekliyor</span>
                  )}


{uye.auth_id && (
  <button 
    onClick={() => handleRolDegistir(uye.id, uye.rol === 'admin' ? 'user' : 'admin')}
    className={`ml-2 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest transition-all ${
      uye.rol === 'admin' 
      ? 'bg-red-100 text-red-600 hover:bg-red-200' 
      : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
    }`}
  >
    {uye.rol === 'admin' ? "Yetkiyi Al" : "Yönetici Yap"}
  </button>
)}


                </div>
              </div>

              <div className="flex items-center gap-3 mt-4 md:mt-0 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0">
                <Link href={`/admin/UyeEkstresi/${uye.id}`} className="flex-1 md:flex-none bg-blue-50 text-blue-600 px-6 py-2.5 rounded-xl font-black text-xs hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2">
                  <Info size={16} /> EKSTRE
                </Link>
                <button onClick={() => handleOpenModal(uye)} className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:bg-amber-50 hover:text-amber-600 transition-colors">
                  <Edit size={18} />
                </button>
                <button onClick={() => handleDelete(uye.id)} className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-black text-gray-800 uppercase tracking-tighter">
                {editingUye ? "Üye Bilgilerini Güncelle" : "Yeni Üye Kaydı Oluştur"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Tam Adı Soyadı</label>
                <input 
                  required
                  className="w-full bg-gray-50 border-2 border-gray-100 p-3 rounded-xl font-bold outline-none focus:border-teal-500 transition-all uppercase"
                  value={formData.ad}
                  onChange={(e) => setFormData({...formData, ad: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Telefon</label>
                  <input 
                    className="w-full bg-gray-50 border-2 border-gray-100 p-3 rounded-xl font-bold outline-none focus:border-teal-500 transition-all"
                    value={formData.telefon}
                    onChange={(e) => setFormData({...formData, telefon: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">E-Posta</label>
                  <input 
                    type="email"
                    required
                    className="w-full bg-gray-50 border-2 border-gray-100 p-3 rounded-xl font-bold outline-none focus:border-teal-500 transition-all"
                    value={formData.eposta}
                    onChange={(e) => setFormData({...formData, eposta: e.target.value})}
                  />
                </div>
              </div>

              {!editingUye && (
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                  <label className="text-[10px] font-black text-amber-600 uppercase mb-1 flex items-center gap-1">
                    <Lock size={12}/> Geçici Şifre Belirle
                  </label>
                  <input 
                    required
                    className="w-full bg-white border-2 border-amber-200 p-3 rounded-xl font-bold outline-none focus:border-amber-500 transition-all text-amber-700"
                    value={formData.sifre}
                    onChange={(e) => setFormData({...formData, sifre: e.target.value})}
                  />
                  <p className="text-[9px] text-amber-500 mt-2 font-bold italic">* Üye bu e-posta ve şifre ile giriş yapacaktır.</p>
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-teal-600 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl shadow-teal-100 hover:bg-teal-700 transition-all mt-4 disabled:bg-gray-300"
              >
                {loading ? "İŞLEM YAPILIYOR..." : (editingUye ? "Değişiklikleri Kaydet" : "Üyeyi Kaydet ve Giriş Aç")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}