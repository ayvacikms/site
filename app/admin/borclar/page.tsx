"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { 
  Search, Trash2, Calendar, 
  CheckCircle2, AlertCircle, XCircle,
  Wallet, Users2
} from "lucide-react";
import toast from "react-hot-toast";

type Borc = {
  id: string;
  borc_tutari: number;
  borc_tarih: string;
  odendi: boolean;
  aciklama: string;
  gider: { baslik: string };
  uye: { ad: string };
};

export default function BorclarPage() {
  const [borclar, setBorclar] = useState<Borc[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => { fetchBorclar(); }, []);

  const fetchBorclar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("gider_uyeler")
      .select("id, borc_tutari, borc_tarih, odendi, aciklama, gider:giderler(baslik), uye:uyeler(ad)")
      .order("borc_tarih", { ascending: false });

    if (error) toast.error("Veriler çekilemedi");
    else setBorclar(data || []);
    setLoading(false);
  };

  // Filtreleme Mantığı
  const filteredBorclar = useMemo(() => {
    return borclar.filter((borc) => {
      const matchesSearch = 
        borc.uye?.ad?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        borc.gider?.baslik?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        borc.aciklama?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = 
        statusFilter === "all" ? true :
        statusFilter === "paid" ? borc.odendi === true :
        borc.odendi === false;

      const matchesDate = 
        (!startDate || new Date(borc.borc_tarih) >= new Date(startDate)) &&
        (!endDate || new Date(borc.borc_tarih) <= new Date(endDate));

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [borclar, searchQuery, statusFilter, startDate, endDate]);

  // --- YENİ: ANLIK İSTATİSTİK HESAPLAMA ---
  const stats = useMemo(() => {
    const odenenler = filteredBorclar.filter(b => b.odendi);
    const odenmeyenler = filteredBorclar.filter(b => !b.odendi);

    return {
      odenenTutar: odenenler.reduce((acc, curr) => acc + Number(curr.borc_tutari), 0),
      odenenKisi: odenenler.length,
      odenmeyenTutar: odenmeyenler.reduce((acc, curr) => acc + Number(curr.borc_tutari), 0),
      odenmeyenKisi: odenmeyenler.length
    };
  }, [filteredBorclar]);

  const handleDelete = async (id: string) => {
    if (!confirm("Bu borç kaydını silmek istediğinize emin misiniz?")) return;
    const { error } = await supabase.from("gider_uyeler").delete().eq("id", id);
    if (error) toast.error("Silme işlemi başarısız");
    else {
      setBorclar(prev => prev.filter(b => b.id !== id));
      toast.success("Borç kaydı silindi");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Borç Yönetimi</h1>
      </div>

      {/* --- YENİ: MOBİL UYUMLU İSTATİSTİK KARTLARI --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Ödendi Kartı */}
        <div className="bg-white p-5 rounded-[24px] border border-teal-100 shadow-sm flex items-center justify-between group overflow-hidden relative">
          <div className="absolute right-[-10px] top-[-10px] text-teal-50 opacity-10 group-hover:scale-110 transition-transform">
             <CheckCircle2 size={80} />
          </div>
          <div>
            <p className="text-[10px] font-black text-teal-500 uppercase tracking-widest mb-1">Toplam Ödenen</p>
            <h3 className="text-2xl font-black text-teal-700">{stats.odenenTutar.toLocaleString('tr-TR')} ₺</h3>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-slate-400">
               <Users2 size={14} className="text-teal-500" /> {stats.odenenKisi} İşlem / Kişi
            </div>
          </div>
          <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl z-10">
            <Wallet size={24} />
          </div>
        </div>

        {/* Ödenmedi Kartı */}
        <div className="bg-white p-5 rounded-[24px] border border-rose-100 shadow-sm flex items-center justify-between group overflow-hidden relative">
          <div className="absolute right-[-10px] top-[-10px] text-rose-50 opacity-10 group-hover:scale-110 transition-transform">
             <XCircle size={80} />
          </div>
          <div>
            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Toplam Bekleyen</p>
            <h3 className="text-2xl font-black text-rose-700">{stats.odenmeyenTutar.toLocaleString('tr-TR')} ₺</h3>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-slate-400">
               <Users2 size={14} className="text-rose-500" /> {stats.odenmeyenKisi} Bekleyen İşlem
            </div>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl z-10">
            <AlertCircle size={24} />
          </div>
        </div>
      </div>

      {/* FİLTRELEME ALANI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-[24px] shadow-sm border border-slate-100">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={18} />
          <input 
            placeholder="Üye veya Gider Ara..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-semibold outline-none focus:ring-2 ring-teal-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select 
          className="bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 ring-teal-500 appearance-none cursor-pointer"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Tüm Durumlar</option>
          <option value="paid">Sadece Ödenenler</option>
          <option value="unpaid">Sadece Ödenmeyenler</option>
        </select>

        <input 
          type="date"
          className="bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 ring-teal-500"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        
        <input 
          type="date"
          className="bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 ring-teal-500"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      {/* TABLO (Responsive Wrapper ile) */}
      <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase">Üye ADI</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase">Gider / Açıklama</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-center">Tutar</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-center">Vade</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-center">DURUM</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-center">İŞLEM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredBorclar.map((borc) => (
                <tr key={borc.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-extrabold text-slate-700 text-sm uppercase">{borc.uye?.ad}</td>
                  <td className="p-4">
                    <p className="font-bold text-slate-800 text-xs">{borc.gider?.baslik || borc.aciklama}</p>
                  </td>
                  <td className="p-4 text-center font-black text-slate-900">{borc.borc_tutari.toLocaleString('tr-TR')} ₺</td>
                  <td className="p-4 text-center text-xs font-bold text-slate-500">
                    {format(new Date(borc.borc_tarih), "dd.MM.yyyy")}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                      borc.odendi ? "bg-teal-50 text-teal-600" : "bg-red-50 text-red-600"
                    }`}>
                      {borc.odendi ? <CheckCircle2 size={12}/> : <XCircle size={12}/>}
                      {borc.odendi ? "ÖDENDİ" : "ÖDENMEDİ"}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => handleDelete(borc.id)}
                      className="p-2 text-slate-300 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredBorclar.length === 0 && (
          <div className="p-20 text-center text-slate-400 font-bold uppercase text-xs tracking-widest italic">
            Eşleşen kayıt bulunamadı.
          </div>
        )}
      </div>
    </div>
  );
}