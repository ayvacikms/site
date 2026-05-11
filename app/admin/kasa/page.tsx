"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Plus, Search, Calendar, Wallet, Landmark, 
  ArrowUpCircle, ArrowDownCircle, Filter, Trash2, Edit, X, 
  Building2, Banknote, ChevronDown 
} from "lucide-react";
import toast from "react-hot-toast";

export default function KasaPage() {
  const [hareketler, setHareketler] = useState([]);
  const [cariler, setCariler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Cari Arama State'leri
  const [cariSearch, setCariSearch] = useState("");
  const [isCariDropdownOpen, setIsCariDropdownOpen] = useState(false);

  // Filtreler
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMetot, setFilterMetot] = useState("Hepsi");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [formData, setFormData] = useState({
    id: null,
    is_tipi: "Giriş",
    odeme_yontemi: "Banka/EFT",
    tutar: "",
    aciklama: "",
    cari_id: null, // "null" string yerine direkt null kullanıyoruz
    cari_ad: "", // Seçilen carinin adını modalda göstermek için
    islem_tarihi: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchKasa();
    fetchCariler();
  }, []);

  const fetchKasa = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("kasa_hareketler")
      .select(`
        *,
        cariler (cari_ad)
      `)
      .order("islem_tarihi", { ascending: false });

    if (error) toast.error("Kasa verileri yüklenemedi");
    else setHareketler(data || []);
    setLoading(false);
  };

  const fetchCariler = async () => {
    // Veritabanında cariler tablosunu kontrol edin, tablo doluysa mutlaka gelecektir.
    const { data, error } = await supabase.from("cariler").select("id, cari_ad").order("cari_ad");
    if (error) {
      console.error("Cari çekme hatası:", error);
      toast.error("Cari listesi yüklenemedi");
    } else {
      setCariler(data || []);
    }
  };

  // Aramalı Cari Filtreleme (Memoized)
  const filteredCariler = useMemo(() => {
    return cariler.filter(c => 
      c.cari_ad.toLowerCase().includes(cariSearch.toLowerCase())
    );
  }, [cariler, cariSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tutarNum = parseFloat(formData.tutar);

    try {
      if (formData.id) {
        const { error } = await supabase
          .from("kasa_hareketler")
          .update({
            islem_tipi: formData.is_tipi,
            odeme_yontemi: formData.odeme_yontemi,
            tutar: tutarNum,
            aciklama: formData.aciklama,
            islem_tarihi: formData.islem_tarihi
          })
          .eq("id", formData.id);
        if (error) throw error;
      } else {
        const { data: kasaHareketi, error: kError } = await supabase
          .from("kasa_hareketler")
          .insert([{
            islem_tipi: formData.is_tipi,
            odeme_yontemi: formData.odeme_yontemi,
            tutar: tutarNum,
            aciklama: formData.aciklama,
            islem_tarihi: formData.islem_tarihi,
            // Opsiyonel: Kasa tablosunda cari_id sütunu varsa ekleyebiliriz
          }])
          .select().single();
        
        if (kError) throw kError;

        if (formData.cari_id) {
          const { error: cError } = await supabase
            .from("cari_hareketler")
            .insert([{
              cari_id: formData.cari_id,
              islem_tipi: formData.is_tipi === "Çıkış" ? "Ödeme" : "Borç",
              tutar: tutarNum,
              aciklama: `Kasa İşlemi: ${formData.aciklama}`,
              islem_tarihi: formData.islem_tarihi
            }]);
          if (cError) toast.error("Cari ekstresine işlenirken hata oluştu!");
        }
      }

      toast.success("İşlem başarıyla kaydedildi");
      setIsModalOpen(false);
      fetchKasa();
    } catch (error) {
      toast.error("İşlem sırasında bir hata oluştu");
    }
  };

  const deleteIslem = async (id) => {
    if (!confirm("Bu kasa işlemini silmek istediğinize emin misiniz?")) return;
    const { error } = await supabase.from("kasa_hareketler").delete().eq("id", id);
    if (error) toast.error("Silinemedi");
    else { toast.success("İşlem silindi"); fetchKasa(); }
  };

  const filteredData = hareketler.filter(item => {
    const matchesSearch = item.aciklama?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMetot = filterMetot === "Hepsi" || item.odeme_yontemi === filterMetot;
    const itemDate = new Date(item.islem_tarihi);
    const matchesStart = !startDate || itemDate >= new Date(startDate);
    const matchesEnd = !endDate || itemDate <= new Date(endDate);
    return matchesSearch && matchesMetot && matchesStart && matchesEnd;
  });

  const totals = filteredData.reduce((acc, curr) => {
    if (curr.islem_tipi === "Giriş") acc.gelir += curr.tutar;
    else acc.gider += curr.tutar;
    return acc;
  }, { gelir: 0, gider: 0 });

  return (
    <div className="space-y-6 pb-10">
      {/* Üst Rapor Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 mb-2 text-emerald-500">
            <div className="p-2 bg-emerald-50 rounded-xl"><ArrowUpCircle size={20} /></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Toplam Gelir</span>
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter">{totals.gelir.toLocaleString('tr-TR')} TL</h2>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 mb-2 text-rose-500">
            <div className="p-2 bg-rose-50 rounded-xl"><ArrowDownCircle size={20} /></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Toplam Gider</span>
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter">{totals.gider.toLocaleString('tr-TR')} TL</h2>
        </div>
        <div className="bg-[#1E293B] p-6 rounded-[2.5rem] shadow-xl">
          <div className="flex items-center gap-4 mb-2 text-[#4FBCA1]">
            <div className="p-2 bg-slate-800 rounded-xl"><Wallet size={20} /></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Net Mevcut</span>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tighter">{(totals.gelir - totals.gider).toLocaleString('tr-TR')} TL</h2>
        </div>
      </div>

      {/* Filtreleme Çubuğu */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-col lg:flex-row gap-4 items-center">
        <div className="flex-1 flex items-center bg-slate-50 px-4 py-2 rounded-2xl w-full">
          <Search className="text-slate-400 mr-2" size={20} />
          <input 
            type="text" placeholder="Açıklama ara..." 
            className="bg-transparent outline-none w-full font-bold text-sm h-10"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full lg:w-auto">
          <input type="date" className="bg-slate-50 p-3 rounded-2xl text-xs font-bold outline-none flex-1 border-none" onChange={(e)=>setStartDate(e.target.value)}/>
          <input type="date" className="bg-slate-50 p-3 rounded-2xl text-xs font-bold outline-none flex-1 border-none" onChange={(e)=>setEndDate(e.target.value)}/>
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
            setFormData({ id: null, is_tipi: "Giriş", odeme_yontemi: "Banka/EFT", tutar: "", aciklama: "", cari_id: null, cari_ad: "", islem_tarihi: new Date().toISOString().split('T')[0] }); 
            setCariSearch("");
            setIsModalOpen(true); 
          }}
          className="bg-[#4FBCA1] text-white px-8 py-3 rounded-2xl font-black text-xs uppercase shadow-lg shadow-[#4FBCA1]/20 w-full lg:w-auto transition-transform active:scale-95"
        >
          Yeni İşlem
        </button>
      </div>

      {/* Liste Tablosu */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-6 text-[10px] font-black uppercase text-slate-400">Tarih</th>
                <th className="p-6 text-[10px] font-black uppercase text-slate-400">Tür</th>
                <th className="p-6 text-[10px] font-black uppercase text-slate-400">Açıklama / Cari</th>
                <th className="p-6 text-[10px] font-black uppercase text-slate-400 text-right">Tutar</th>
                <th className="p-6 text-[10px] font-black uppercase text-slate-400 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-6 text-xs font-bold text-slate-500">{new Date(item.islem_tarihi).toLocaleDateString('tr-TR')}</td>
                  <td className="p-6">
                    <div className="flex flex-col">
                      <span className={`text-[10px] font-black uppercase ${item.islem_tipi === 'Giriş' ? 'text-emerald-500' : 'text-rose-500'}`}>{item.islem_tipi}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                        {item.odeme_yontemi === 'Nakit' ? <Banknote size={10}/> : <Landmark size={10}/>} {item.odeme_yontemi}
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
                  <td className={`p-6 text-right font-black text-lg ${item.islem_tipi === 'Giriş' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {item.islem_tipi === 'Giriş' ? '+' : '-'}{item.tutar.toLocaleString('tr-TR')} TL
                  </td>
                  <td className="p-6">
                    <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setFormData({...item, tutar: item.tutar.toString(), cari_id: null, cari_ad: item.cariler?.cari_ad || ""}); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-500"><Edit size={16}/></button>
                      <button onClick={() => deleteIslem(item.id)} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: YENİ İŞLEM */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-8 shadow-2xl relative overflow-visible">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{formData.id ? 'Düzenle' : 'Yeni Kasa Kaydı'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"><X/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                {['Giriş', 'Çıkış'].map(t => (
                  <button key={t} type="button" onClick={() => setFormData({...formData, is_tipi: t})} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase transition-all ${formData.is_tipi === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>
                    {t === 'Giriş' ? '📥 Gelir' : '📤 Gider'}
                  </button>
                ))}
              </div>

              {/* ARAMALI CARİ SEÇİCİ */}
              <div className="relative">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">İlgili Cari (Opsiyonel)</label>
                <div 
                  className={`mt-1 w-full p-4 rounded-2xl bg-slate-50 flex justify-between items-center cursor-pointer border-2 transition-all ${isCariDropdownOpen ? 'border-[#4FBCA1] bg-white' : 'border-transparent'}`}
                  onClick={() => !formData.id && setIsCariDropdownOpen(!isCariDropdownOpen)}
                >
                  <span className={`font-bold text-sm ${formData.cari_ad ? 'text-slate-800' : 'text-slate-400'}`}>
                    {formData.cari_ad || "Cari Seçiniz..."}
                  </span>
                  <ChevronDown size={18} className={`text-slate-400 transition-transform ${isCariDropdownOpen ? 'rotate-180' : ''}`}/>
                </div>

                {isCariDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[110] overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="p-3 border-b border-slate-50 bg-slate-50">
                      <div className="flex items-center bg-white px-3 py-2 rounded-xl border border-slate-200">
                        <Search size={14} className="text-slate-400 mr-2"/>
                        <input 
                          autoFocus
                          type="text" 
                          placeholder="Firma adı ara..." 
                          className="bg-transparent outline-none w-full text-xs font-bold"
                          value={cariSearch}
                          onChange={(e) => setCariSearch(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <div 
                        className="p-4 text-xs font-black text-rose-500 hover:bg-slate-50 cursor-pointer uppercase border-b border-slate-50"
                        onClick={() => {
                          setFormData({...formData, cari_id: null, cari_ad: ""});
                          setIsCariDropdownOpen(false);
                        }}
                      >
                        ❌ Seçimi Temizle (Genel İşlem)
                      </div>
                      {filteredCariler.length > 0 ? (
                        filteredCariler.map(c => (
                          <div 
                            key={c.id} 
                            className="p-4 text-xs font-bold text-slate-600 hover:bg-[#4FBCA1] hover:text-white cursor-pointer transition-colors"
                            onClick={() => {
                              setFormData({...formData, cari_id: c.id, cari_ad: c.cari_ad});
                              setIsCariDropdownOpen(false);
                              setCariSearch("");
                            }}
                          >
                            {c.cari_ad}
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-xs text-slate-400 text-center font-bold">Sonuç bulunamadı</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Tarih</label>
                  <input type="date" value={formData.islem_tarihi} className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none font-bold text-sm mt-1" onChange={(e)=>setFormData({...formData, islem_tarihi: e.target.value})}/>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Yöntem</label>
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

              <textarea placeholder="Açıklama..." value={formData.aciklama} className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none font-bold h-20 text-sm" onChange={(e)=>setFormData({...formData, aciklama: e.target.value})}/>
              
              <button type="submit" className="w-full bg-[#1E293B] text-white p-5 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-transform active:scale-95">
                {formData.id ? 'GÜNCELLE' : 'İŞLEMİ KAYDET'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}