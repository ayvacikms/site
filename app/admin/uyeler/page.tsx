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
  User
} from "lucide-react";
import Link from "next/link";

export default function UyelerPage() {
  const [uyeler, setUyeler] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUye, setEditingUye] = useState<any>(null);
  const [formData, setFormData] = useState({ ad: "", telefon: "", eposta: "" });

  useEffect(() => {
    fetchUyeler();
  }, []);

  const fetchUyeler = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("uyeler").select("*").order("ad", { ascending: true });
    if (!error) setUyeler(data || []);
    setLoading(false);
  };

  const handleOpenModal = (uye = null) => {
    if (uye) {
      setEditingUye(uye);
      setFormData({ ad: uye.ad, telefon: uye.telefon || "", eposta: uye.eposta || "" });
    } else {
      setEditingUye(null);
      setFormData({ ad: "", telefon: "", eposta: "" });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (editingUye) {
      // GÜNCELLEME
      const { error } = await supabase.from("uyeler").update(formData).eq("id", editingUye.id);
      if (error) alert("Güncelleme hatası: " + error.message);
    } else {
      // YENİ EKLEME
      const { error } = await supabase.from("uyeler").insert([formData]);
      if (error) alert("Ekleme hatası: " + error.message);
    }

    setIsModalOpen(false);
    fetchUyeler();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bu üyeyi silmek istediğinize emin misiniz? Tüm borç ve ödeme geçmişi de silinecektir.")) {
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
            <h1 className="text-2xl font-black text-gray-800 tracking-tight uppercase">Yönetim Paneli / Üyeler</h1>
            <p className="text-gray-500 text-xs font-bold mt-1">Aktif Üye Sayısı: {uyeler.length}</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={() => handleOpenModal()}
              className="flex-1 md:flex-none bg-teal-600 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-teal-100 font-bold text-sm hover:bg-teal-700 transition-all flex items-center justify-center gap-2"
            >
              <UserPlus size={18} /> Yeni Üye Ekle
            </button>
            <div className="relative group">
              <button className="bg-white text-gray-700 border border-gray-200 px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-gray-50 shadow-sm">
                <Download size={18} /> Rapor Al
              </button>
              {/* Rapor Dropdown Simülasyonu */}
              <div className="absolute right-0 mt-2 w-48 bg-white border rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none group-hover:pointer-events-auto">
                <button className="w-full text-left p-3 text-xs font-bold hover:bg-gray-50 flex items-center gap-2 border-b"><FileText size={14} className="text-red-500"/> PDF Olarak İndir</button>
                <button className="w-full text-left p-3 text-xs font-bold hover:bg-gray-50 flex items-center gap-2"><FileText size={14} className="text-green-600"/> Excel Olarak İndir</button>
              </div>
            </div>
          </div>
        </div>

        {/* ARA PANEL */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-6 shadow-sm flex items-center gap-4">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Hızlı üye araması..." 
              className="w-full border-2 border-gray-50 bg-gray-50 rounded-xl pl-4 pr-10 py-3 text-sm focus:bg-white focus:border-teal-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute right-4 top-3.5 text-gray-400" size={18} />
          </div>
          <button onClick={fetchUyeler} className="bg-indigo-600 p-3 text-white rounded-xl hover:bg-indigo-700 shadow-md">
            <RefreshCw size={20} />
          </button>
        </div>

        {/* LİSTE */}
        <div className="grid grid-cols-1 gap-4">
          {loading ? (
             <div className="text-center py-10 font-bold text-gray-400">Yükleniyor...</div>
          ) : filteredUyeler.map((uye) => (
            <div key={uye.id} className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between hover:shadow-xl hover:shadow-gray-200/50 transition-all group">
              
              <div className="flex items-center gap-5 flex-1 w-full">
                <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-all">
                  <User size={28} />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-800 uppercase text-base">{uye.ad}</h3>
                  <p className="text-teal-600 text-xs font-black">{uye.telefon || "Tel: - "}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-4 md:mt-0 w-full md:w-auto">
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

      {/* ÜYE EKLE / GÜNCELLE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-black text-gray-800 uppercase tracking-tighter">
                {editingUye ? "Üye Bilgilerini Güncelle" : "Yeni Üye Kaydı"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Ad Soyad</label>
                <input 
                  required
                  className="w-full bg-gray-50 border-2 border-gray-100 p-3 rounded-xl font-bold outline-none focus:border-teal-500 transition-all"
                  value={formData.ad}
                  onChange={(e) => setFormData({...formData, ad: e.target.value.toUpperCase()})}
                />
              </div>
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
                  className="w-full bg-gray-50 border-2 border-gray-100 p-3 rounded-xl font-bold outline-none focus:border-teal-500 transition-all"
                  value={formData.eposta}
                  onChange={(e) => setFormData({...formData, eposta: e.target.value})}
                />
              </div>
              <button 
                type="submit" 
                className="w-full bg-teal-600 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl shadow-teal-100 hover:bg-teal-700 transition-all mt-4"
              >
                {editingUye ? "Değişiklikleri Kaydet" : "Üyeyi Sisteme Ekle"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}