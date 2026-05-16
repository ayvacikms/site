"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Plus, Search, Calendar, Wallet, Landmark, 
  ArrowUpCircle, ArrowDownCircle, Filter, Trash2, Edit, X, 
  Building2, Banknote, ChevronDown, FileSpreadsheet, FileText 
} from "lucide-react";
import toast from "react-hot-toast";

// --- TİP TANIMLAMALARI ---
interface Cari {
  id: string;
  cari_ad: string;
}

interface KasaHareketi {
  id: string;
  islem_tipi: "Giriş" | "Çıkış" | string; // Gelen eski hatalı verileri ("gelir") patlatmaması için string eklendi
  odeme_yontemi: string;
  tutar: number;
  aciklama: string;
  islem_tarihi: string;
  ilgili_id: string;
  cariler?: Cari | null;
}

export default function KasaPage() {
  const [hareketler, setHareketler] = useState<KasaHareketi[]>([]);
  const [cariler, setCariler] = useState<Cari[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cariSearch, setCariSearch] = useState("");
  const [isCariDropdownOpen, setIsCariDropdownOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterMetot, setFilterMetot] = useState("Hepsi");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [formData, setFormData] = useState({
    id: null as string | null,
    is_tipi: "Giriş" as "Giriş" | "Çıkış",
    odeme_yontemi: "Banka/EFT",
    tutar: "",
    aciklama: "",
    cari_id: "", 
    cari_ad: "",
    islem_tarihi: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchKasa();
    fetchCariler();
  }, []);

  const fetchKasa = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("kasa_hareketler")
        .select(`
          *,
          cariler (id, cari_ad)
        `)
        .order("islem_tarihi", { ascending: false });

      if (error) {
        toast.error("Kasa verileri yüklenemedi: " + error.message);
      } else {
        setHareketler(data as unknown as KasaHareketi[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCariler = async () => {
    const { data, error } = await supabase.from("cariler").select("id, cari_ad").order("cari_ad");
    if (!error) setCariler(data || []);
  };

  const filteredCariler = useMemo(() => {
    return cariler.filter(c => c.cari_ad.toLowerCase().includes(cariSearch.toLowerCase()));
  }, [cariler, cariSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.cari_id) {
      toast.error("Lütfen bir Cari seçimi yapınız.");
      return;
    }

    const tutarNum = parseFloat(formData.tutar);

    try {
      if (formData.id) {
        const { error } = await supabase.from("kasa_hareketler").update({
          islem_tipi: formData.is_tipi,
          odeme_yontemi: formData.odeme_yontemi,
          tutar: tutarNum,
          aciklama: formData.aciklama,
          islem_tarihi: formData.islem_tarihi
        }).eq("id", formData.id);
        if (error) throw error;
      } else {
        // 1. Kasa Hareketi Kaydı
        const { error: kError } = await supabase
          .from("kasa_hareketler")
          .insert([{
            islem_tipi: formData.is_tipi, // "Giriş" veya "Çıkış"
            odeme_yontemi: formData.odeme_yontemi,
            tutar: tutarNum,
            aciklama: formData.aciklama,
            islem_tarihi: formData.islem_tarihi,
            ilgili_id: formData.cari_id 
          }]);
        if (kError) throw kError;

        // 2. Cari Ekstresine Yansıtma
        const { error: cError } = await supabase
          .from("cari_hareketler")
          .insert([{
            cari_id: formData.cari_id,
            islem_tipi: formData.is_tipi === "Çıkış" ? "Ödeme" : "Borç",
            tutar: tutarNum,
            aciklama: `Kasa Entegre: ${formData.aciklama}`,
            islem_tarihi: formData.islem_tarihi
          }]);
        if (cError) toast.error("Cari ekstresine yansıtılamadı ama kasa kaydedildi.");
      }

      toast.success("İşlem başarıyla kaydedildi.");
      setIsModalOpen(false);
      fetchKasa();
    } catch (error: any) {
      toast.error("İşlem sırasında hata oluştu: " + (error?.message || "Bilinmeyen Hata"));
      console.error("Kasa Kayıt Hatası:", error);
    }
  };

  const deleteIslem = async (id: string) => {
    if (!confirm("Bu işlemi silmek istediğinize emin misiniz?")) return;
    const { error } = await supabase.from("kasa_hareketler").delete().eq("id", id);
    if (error) toast.error("Silinemedi: " + error.message);
    else { toast.success("İşlem silindi"); fetchKasa(); }
  };

  const filteredData = hareketler.filter(item => {
    const matchesSearch = (item.aciklama?.toLowerCase() || "").includes(searchTerm.toLowerCase()) || 
                          (item.cariler?.cari_ad?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    
    // Küçük/büyük harf veya "gelir" kelimesi uyuşmazlığını önlemek için lowercase kontrolü eklendi
    const matchesMetot = filterMetot === "Hepsi" || item.odeme_yontemi.toLowerCase() === filterMetot.toLowerCase();
    
    const itemDate = new Date(item.islem_tarihi);
    const matchesStart = !startDate || itemDate >= new Date(startDate);
    const matchesEnd = !endDate || itemDate <= new Date(endDate);
    return matchesSearch && matchesMetot && matchesStart && matchesEnd;
  });

  const totals = filteredData.reduce((acc, curr) => {
    // Veritabanındaki eski hatalı küçük "gelir" kayıtlarını da "Giriş" sayabilmesi için toLowerCase eklendi
    if (curr.islem_tipi.toLowerCase() === "giriş" || curr.islem_tipi.toLowerCase() === "gelir") {
      acc.gelir += curr.tutar;
    } else {
      acc.gider += curr.tutar;
    }
    return acc;
  }, { gelir: 0, gider: 0 });

  return (
    <div className="space-y-6 pb-10">
      {/* Üst Rapor Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm transition-transform hover:scale-[1.02]">
          <div className="flex items-center gap-4 mb-2 text-emerald-500">
            <div className="p-2 bg-emerald-50 rounded-xl"><ArrowUpCircle size={20} /></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Toplam Giriş</span>
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter">{totals.gelir.toLocaleString('tr-TR')} TL</h2>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm transition-transform hover:scale-[1.02]">
          <div className="flex items-center gap-4 mb-2 text-rose-500">
            <div className="p-2 bg-rose-50 rounded-xl"><ArrowDownCircle size={20} /></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Toplam Çıkış</span>
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter">{totals.gider.toLocaleString('tr-TR')} TL</h2>
        </div>
        <div className="bg-[#1E293B] p-6 rounded-[2.5rem] shadow-xl transition-transform hover:scale-[1.02]">
          <div className="flex items-center gap-4 mb-2 text-[#4FBCA1]">
            <div className="p-2 bg-slate-800 rounded-xl"><Wallet size={20} /></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Kasa Net Mevcut</span>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tighter">{(totals.gelir - totals.gider).toLocaleString('tr-TR')} TL</h2>
        </div>
      </div>

      {/* Arama ve Filtreleme */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          <div className="flex-1 flex items-center bg-slate-50 px-4 py-2 rounded-2xl w-full border border-transparent focus-within:border-emerald-500 transition-all">
            <Search className="text-slate-400 mr-2" size={20} />
            <input 
              type="text" placeholder="Açıklama veya Cari ara..." 
              className="bg-transparent outline-none w-full font-bold text-sm h-10"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full lg:w-auto">
            <input type="date" className="bg-slate-50 p-3 rounded-2xl text-xs font-bold outline-none border-none" onChange={(e)=>setStartDate(e.target.value)}/>
            <input type="date" className="bg-slate-50 p-3 rounded-2xl text-xs font-bold outline-none border-none" onChange={(e)=>setEndDate(e.target.value)}/>
          </div>
          <select 
            className="bg-slate-50 p-3 rounded-2xl text-xs font-bold outline-none w-full lg:w-auto border-none cursor-pointer"
            onChange={(e) => setFilterMetot(e.target.value)}
          >
            <option value="Hepsi">Tüm Yöntemler</option>
            <option value="Nakit">💵 Nakit</option>
            <option value="Banka/EFT">🏦 Banka</option>
          </select>
          <button 
            onClick={() => { 
              setFormData({ id: null, is_tipi: "Giriş", odeme_yontemi: "Banka/EFT", tutar: "", aciklama: "", cari_id: "", cari_ad: "", islem_tarihi: new Date().toISOString().split('T')[0] }); 
              setIsModalOpen(true); 
            }}
            className="bg-[#1E293B] text-white px-8 py-3 rounded-2xl font-black text-xs uppercase shadow-lg w-full lg:w-auto hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Plus size={16}/> YENİ İŞLEM
          </button>
        </div>
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-6 text-[10px] font-black uppercase text-slate-400">Tarih</th>
                <th className="p-6 text-[10px] font-black uppercase text-slate-400">Tür / Yöntem</th>
                <th className="p-6 text-[10px] font-black uppercase text-slate-400">Açıklama & İlgili Cari</th>
                <th className="p-6 text-[10px] font-black uppercase text-slate-400 text-right">Tutar</th>
                <th className="p-6 text-[10px] font-black uppercase text-slate-400 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="p-20 text-center font-black text-slate-300 uppercase tracking-widest animate-pulse">Veriler yükleniyor...</td></tr>
              ) : filteredData.map((item) => {
                const isGiris = item.islem_tipi.toLowerCase() === 'giriş' || item.islem_tipi.toLowerCase() === 'gelir';
                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-6 text-xs font-bold text-slate-500">{new Date(item.islem_tarihi).toLocaleDateString('tr-TR')}</td>
                    <td className="p-6">
                      <div className="flex flex-col">
                        <span className={`text-[10px] font-black uppercase ${isGiris ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {isGiris ? 'Giriş' : 'Çıkış'}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                          {item.odeme_yontemi.toLowerCase() === 'nakit' ? <Banknote size={10}/> : <Landmark size={10}/>} {item.odeme_yontemi}
                        </span>
                      </div>
                    </td>
                    <td className="p-6">
                      <p className="text-sm font-bold text-slate-700">{item.aciklama}</p>
                      {item.cariler?.cari_ad && (
                        <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-black flex items-center gap-1 w-fit mt-1 uppercase">
                          <Building2 size={10}/> {item.cariler.cari_ad}
                        </span>
                      )}
                    </td>
                    <td className={`p-6 text-right font-black text-lg ${isGiris ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {isGiris ? '+' : '-'}{Number(item.tutar).toLocaleString('tr-TR')} TL
                    </td>
                    <td className="p-6">
                      <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => deleteIslem(item.id)} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Kısmı */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-8 shadow-2xl relative">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Yeni Kasa Kaydı</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"><X/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                {['Giriş', 'Çıkış'].map(t => (
                  <button 
                    key={t} type="button" 
                    onClick={() => setFormData({...formData, is_tipi: t as "Giriş" | "Çıkış"})} 
                    className={`flex-1 py-3 rounded-xl font-black text-xs uppercase transition-all ${formData.is_tipi === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
                  >
                    {t === 'Giriş' ? '📥 Gelir / Giriş' : '📤 Gider / Çıkış'}
                  </button>
                ))}
              </div>

              <div className="relative">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">İlgili Cari / Firma <span className="text-rose-500">*</span></label>
                <div 
                  className={`mt-1 w-full p-4 rounded-2xl bg-slate-50 flex justify-between items-center cursor-pointer border-2 transition-all ${isCariDropdownOpen ? 'border-emerald-500 bg-white' : 'border-transparent'}`}
                  onClick={() => setIsCariDropdownOpen(!isCariDropdownOpen)}
                >
                  <span className={`font-bold text-sm ${formData.cari_ad ? 'text-slate-800' : 'text-slate-400'}`}>
                    {formData.cari_ad || "Cari Seçimi Zorunludur..."}
                  </span>
                  <ChevronDown size={18} className={`text-slate-400 transition-transform ${isCariDropdownOpen ? 'rotate-180' : ''}`}/>
                </div>

                {isCariDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[110] overflow-hidden">
                    <div className="p-3 border-b border-slate-50 bg-slate-50">
                      <div className="flex items-center bg-white px-3 py-2 rounded-xl border border-slate-200">
                        <Search size={14} className="text-slate-400 mr-2"/>
                        <input autoFocus type="text" placeholder="Firma ara..." className="bg-transparent outline-none w-full text-xs font-bold" value={cariSearch} onChange={(e) => setCariSearch(e.target.value)} />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredCariler.map(c => (
                        <div key={c.id} className="p-4 text-xs font-bold text-slate-600 hover:bg-emerald-500 hover:text-white cursor-pointer transition-colors"
                             onClick={() => { setFormData({...formData, cari_id: c.id, cari_ad: c.cari_ad}); setIsCariDropdownOpen(false); setCariSearch(""); }}>
                          {c.cari_ad}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">İşlem Tarihi</label>
                  <input required type="date" value={formData.islem_tarihi} className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none font-bold text-sm mt-1" onChange={(e)=>setFormData({...formData, islem_tarihi: e.target.value})}/>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Ödeme Metodu</label>
                  <select value={formData.odeme_yontemi} className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none font-bold text-sm mt-1 cursor-pointer" onChange={(e)=>setFormData({...formData, odeme_yontemi: e.target.value})}>
                    <option value="Banka/EFT">🏦 Banka</option>
                    <option value="Nakit">💵 Nakit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Tutar (TL)</label>
                <input required type="number" step="0.01" value={formData.tutar} className="w-full p-5 rounded-[1.5rem] bg-slate-50 border-none outline-none font-black text-3xl text-slate-800 mt-1" placeholder="0.00" onChange={(e)=>setFormData({...formData, tutar: e.target.value})}/>
              </div>

              <textarea placeholder="İşlem açıklaması..." value={formData.aciklama} className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none font-bold h-20 text-sm" onChange={(e)=>setFormData({...formData, aciklama: e.target.value})}/>
              
              <button type="submit" className="w-full bg-[#1E293B] text-white p-5 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all">
                İŞLEMİ KAYDET VE EKSTREYE İŞLE
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}