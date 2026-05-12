"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { 
  Search, Trash2, Filter, Calendar, 
  CheckCircle2, AlertCircle, XCircle 
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
  
  // Filtreleme State'leri
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

  const handleDelete = async (id: string) => {
    if (!confirm("Bu borç kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) return;
    
    const { error } = await supabase.from("gider_uyeler").delete().eq("id", id);
    if (error) {
      toast.error("Silme işlemi başarısız");
    } else {
      setBorclar(prev => prev.filter(b => b.id !== id));
      toast.success("Borç kaydı silindi");
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Borç Yönetimi</h1>
        <div className="flex items-center gap-2 text-sm font-bold text-slate-500 bg-white px-4 py-2 rounded-xl shadow-sm">
          <AlertCircle size={16} className="text-orange-500" />
          Toplam {filteredBorclar.length} Kayıt Listeleniyor
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
          className="bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 ring-teal-500"
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

      {/* TABLO */}
      <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
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
                <td className="p-4 text-center font-black text-slate-900">{borc.borc_tutari} ₺</td>
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
                    title="Sil"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredBorclar.length === 0 && (
          <div className="p-20 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">
            Eşleşen kayıt bulunamadı.
          </div>
        )}
      </div>
    </div>
  );
}