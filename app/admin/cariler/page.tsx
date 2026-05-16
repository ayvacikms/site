"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Plus, Search, Building2, Phone, Trash2, 
  Edit, ArrowUpRight, ArrowDownLeft, X,
  FileSpreadsheet, CheckSquare, Square
} from "lucide-react"; // 👈 Kullanılmayan Landmark, Banknote, Download, Calendar silindi
import toast from "react-hot-toast";

interface Cari {
  id: string;
  cari_ad: string;
  yetkili_kisi?: string;
  telefon?: string;
  kategori?: string;
}

interface CariHareket {
  id: string;
  cari_id: string;
  islem_tipi: 'Borç' | 'Ödeme';
  tutar: number;
  aciklama: string;
  islem_tarihi: string;
}

export default function CarilerPage() {
  const [cariler, setCariler] = useState<Cari[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [isCariModalOpen, setIsCariModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isEkstreModalOpen, setIsEkstreModalOpen] = useState(false);

  const [selectedCari, setSelectedCari] = useState<Cari | null>(null);
  const [ekstreData, setEkstreData] = useState<CariHareket[]>([]);
  const [ekstreFilter, setEkstreFilter] = useState("Hepsi");

  const [cariForm, setCariForm] = useState<Partial<Cari>>({ 
    id: undefined, 
    cari_ad: "", 
    yetkili_kisi: "", 
    telefon: "", 
    kategori: "Genel" 
  });

  const [actionForm, setActionForm] = useState({ 
    tip: "Borç", 
    tutar: "", 
    odemeYontemi: "Banka/EFT", 
    aciklama: "", 
    tarih: new Date().toISOString().split('T')[0],
    tahakkukEkle: true
  });

  // 👈 ESLint Sıralama Hatası Çözümü: fetchCariler fonksiyonunu yukarı aldık
  const fetchCariler = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cariler")
      .select("*")
      .order("cari_ad", { ascending: true });
    
    if (error) toast.error("Veriler yüklenemedi");
    else setCariler(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCariler();
  }, []);

  const handleCariSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { id, ...payload } = cariForm;
    const { error } = id 
      ? await supabase.from("cariler").update(payload).eq("id", id)
      : await supabase.from("cariler").insert([payload]);

    if (error) toast.error("İşlem başarısız");
    else {
      toast.success(id ? "Cari güncellendi" : "Cari eklendi");
      setIsCariModalOpen(false);
      fetchCariler();
    }
  };

  const deleteCari = async (id: string) => {
    if (!window.confirm("Bu cariyi silmek istediğinize emin misiniz?")) return;
    const { error } = await supabase.from("cariler").delete().eq("id", id);
    if (error) toast.error("Silinemedi (İlişkili hareketler olabilir)");
    else { toast.success("Cari silindi"); fetchCariler(); }
  };

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCari) return;

    const tutarNum = parseFloat(actionForm.tutar);
    if (isNaN(tutarNum) || tutarNum <= 0) {
      return toast.error("Geçer Gider Belgesi");
    }

    try {
      const baglantiKodu = `CH-${Date.now()}`; 

      if (actionForm.tip === "Ödeme" && actionForm.tahakkukEkle) {
        const { error: tError } = await supabase
          .from("cari_hareketler")
          .insert([{
            cari_id: selectedCari.id,
            islem_tipi: "Borç",
            tutar: tutarNum,
            aciklama: `[Tahakkuk] ${actionForm.aciklama || 'Kira/Gider Belgesi'} (${baglantiKodu})`,
            islem_tarihi: actionForm.tarih
          }]);
        if (tError) throw tError;
      }

      const { error: hError } = await supabase
        .from("cari_hareketler")
        .insert([{
          cari_id: selectedCari.id,
          islem_tipi: actionForm.tip,
          tutar: tutarNum,
          aciklama: actionForm.aciklama ? `${actionForm.aciklama} (${baglantiKodu})` : `(${baglantiKodu})`,
          islem_tarihi: actionForm.tarih
        }]);
      if (hError) throw hError;

      if (actionForm.tip === "Ödeme") {
        const { error: kError } = await supabase.from("kasa_hareketler").insert([{
          islem_tipi: "Çıkış",
          odeme_yontemi: actionForm.odemeYontemi,
          tutar: tutarNum,
          aciklama: `Cari Ödeme: ${selectedCari.cari_ad} | ${actionForm.aciklama || ''} (${baglantiKodu})`,
          islem_tarihi: actionForm.tarih,
          ilgili_id: selectedCari.id 
        }]);
        if (kError) throw kError;
      }

      toast.success("İşlem başarıyla kaydedildi");
      setIsActionModalOpen(false);
      setActionForm({ tip: "Borç", tutar: "", odemeYontemi: "Banka/EFT", aciklama: "", tarih: new Date().toISOString().split('T')[0], tahakkukEkle: true });
      fetchCariler();
    } catch (err) {
      console.error(err);
      toast.error("Kayıt sırasında bir hata oluştu");
    }
  };

  const openEkstre = async (cari: Cari) => {
    setSelectedCari(cari);
    const { data, error } = await supabase
      .from("cari_hareketler")
      .select("*")
      .eq("cari_id", cari.id)
      .order("islem_tarihi", { ascending: false });
    
    if (error) toast.error("Ekstre alınamadı");
    else { setEkstreData(data || []); setIsEkstreModalOpen(true); }
  };

  const handleActionDelete = async (hareket: CariHareket) => {
    if (!window.confirm("Bu hareketi silmek istediğinize emin misiniz? Bağlı tüm kasa ve tahakkuk kayıtları da silinecektir!")) return;

    try {
      const match = hareket.aciklama?.match(/CH-\d+/);
      const baglantiKodu = match ? match[0] : null;

      if (baglantiKodu) {
        await supabase
          .from("kasa_hareketler")
          .delete()
          .eq("ilgili_id", hareket.cari_id)
          .ilike("aciklama", `%${baglantiKodu}%`);

        const { error: deleteError } = await supabase
          .from("cari_hareketler")
          .delete()
          .eq("cari_id", hareket.cari_id)
          .ilike("aciklama", `%${baglantiKodu}%`);
        
        if (deleteError) throw deleteError;
      } else {
        const { error: singleDeleteError } = await supabase
          .from("cari_hareketler")
          .delete()
          .eq("id", hareket.id);
        
        if (singleDeleteError) throw singleDeleteError;
      }

      toast.success("Hareket ve bağlı tüm kayıtlar silindi");
      
      if (selectedCari) openEkstre(selectedCari);
      fetchCariler();
    } catch (err) {
      console.error(err);
      toast.error("Silme işlemi sırasında bir hata oluştu");
    }
  };

  const filteredEkstre = ekstreData.filter(h => 
    ekstreFilter === "Hepsi" ? true : h.islem_tipi === ekstreFilter
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Cari Rehberi</h1>
          <div className="text-slate-400 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 mt-1">
            <div className="w-2 h-2 bg-[#4FBCA1] rounded-full animate-pulse" /> 
            Tedarikçi ve Esnaf Yönetimi
          </div>
        </div>
        <div className="flex gap-2">
           <button className="p-3 bg-white border border-slate-200 rounded-2xl text-emerald-600 hover:bg-emerald-50 transition-all shadow-sm">
             <FileSpreadsheet size={20}/>
           </button>
           <button 
            onClick={() => { setCariForm({ id: undefined, cari_ad: "", yetkili_kisi: "", telefon: "", kategori: "Genel" }); setIsCariModalOpen(true); }}
            className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-xs flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl uppercase tracking-widest"
          >
            <Plus size={18} /> Yeni Cari
          </button>
        </div>
      </div>

      {/* Arama */}
      <div className="bg-white p-3 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="bg-slate-50 p-3 rounded-2xl text-slate-400"><Search size={20} /></div>
        <input type="text" placeholder="Cari adı ara..." className="flex-1 outline-none text-slate-600 bg-transparent font-bold" onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
           <div className="col-span-full py-20 text-center font-black text-slate-300 animate-pulse uppercase tracking-[0.3em]">Yükleniyor...</div>
        ) : (
          cariler.filter(c => c.cari_ad.toLowerCase().includes(searchTerm.toLowerCase())).map((cari) => (
            <div key={cari.id} className="bg-white rounded-[2.5rem] border border-slate-200 p-7 hover:border-[#4FBCA1] transition-all group relative shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <div className="p-4 bg-slate-50 rounded-[1.5rem] text-slate-400 group-hover:bg-[#4FBCA1] group-hover:text-white transition-all shadow-inner"><Building2 size={28} /></div>
                <div className="flex gap-1">
                  <button onClick={() => { setCariForm(cari); setIsCariModalOpen(true); }} className="p-2 hover:bg-slate-100 text-slate-400 rounded-xl"><Edit size={16}/></button>
                  <button onClick={() => deleteCari(cari.id)} className="p-2 hover:bg-rose-50 text-rose-500 rounded-xl"><Trash2 size={16}/></button>
                </div>
              </div>
              <h3 className="font-black text-slate-800 text-xl mb-1 uppercase tracking-tighter">{cari.cari_ad}</h3>
              <p className="text-slate-400 text-[10px] font-black uppercase mb-4 tracking-widest bg-slate-50 w-fit px-2 py-1 rounded-lg">{cari.yetkili_kisi || "Yetkili Atanmadı"}</p>
              <div className="space-y-2 mb-8">
                <div className="flex items-center gap-3 text-slate-500 text-xs font-bold"><Phone size={14} className="text-[#4FBCA1]"/> {cari.telefon || "Telefon Yok"}</div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-6 border-t border-slate-50">
                <button onClick={() => { setSelectedCari(cari); setIsActionModalOpen(true); }} className="bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase hover:bg-slate-700 transition-all shadow-lg">Hızlı İşlem</button>
                <button onClick={() => openEkstre(cari)} className="bg-white border border-slate-200 text-slate-600 py-4 rounded-2xl font-black text-[10px] uppercase hover:bg-slate-50 transition-all">Ekstre</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Cari Kartı */}
      {isCariModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">{cariForm.id ? 'Kartı Düzenle' : 'Yeni Cari Kartı'}</h2>
              <button onClick={() => setIsCariModalOpen(false)} className="text-slate-400 p-2"><X/></button>
            </div>
            <form onSubmit={handleCariSubmit} className="space-y-5">
              <input required placeholder="Cari Firma Adı" value={cariForm.cari_ad} className="w-full p-4 rounded-2xl bg-slate-50 outline-none font-bold text-sm" onChange={(e)=>setCariForm({...cariForm, cari_ad: e.target.value})}/>
              <input placeholder="Yetkili Kişi" value={cariForm.yetkili_kisi} className="w-full p-4 rounded-2xl bg-slate-50 outline-none font-bold text-sm" onChange={(e)=>setCariForm({...cariForm, yetkili_kisi: e.target.value})}/>
              <input placeholder="Telefon" value={cariForm.telefon} className="w-full p-4 rounded-2xl bg-slate-50 outline-none font-bold text-sm" onChange={(e)=>setCariForm({...cariForm, telefon: e.target.value})}/>
              <button type="submit" className="w-full bg-[#4FBCA1] text-white p-5 rounded-[1.5rem] font-black uppercase shadow-xl"> {cariForm.id ? 'Kaydet' : 'Oluştur'} </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Hareket */}
      {isActionModalOpen && selectedCari && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">İşlem Ekle</h2>
                <p className="text-[#4FBCA1] text-[10px] font-black uppercase tracking-widest">{selectedCari.cari_ad}</p>
              </div>
              <button onClick={() => setIsActionModalOpen(false)} className="text-slate-400 p-2"><X/></button>
            </div>
            <form onSubmit={handleActionSubmit} className="space-y-5">
              <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                {['Borç', 'Ödeme'].map(t => (
                  <button key={t} type="button" onClick={() => setActionForm({...actionForm, tip: t})} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${actionForm.tip === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>
                    {t === 'Borç' ? '💸 Harcama' : '✅ Ödeme'}
                  </button>
                ))}
              </div>

              {actionForm.tip === "Ödeme" && (
                <div 
                  onClick={() => setActionForm({...actionForm, tahakkukEkle: !actionForm.tahakkukEkle})}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-teal-50/50 border border-teal-100 cursor-pointer user-select-none transition-colors hover:bg-teal-50"
                >
                  <div className="text-teal-600">
                    {actionForm.tahakkukEkle ? <CheckSquare size={20} className="fill-teal-50" /> : <Square size={20} />}
                  </div>
                  <div>
                    <p className="text-xs font-black text-teal-900 uppercase tracking-tight">Önce Belge/Kira Tahakkuku Yap</p>
                    <p className="text-[10px] font-bold text-teal-600 uppercase mt-0.5">Cari önce alacaklanır, bakiye sıfırlanır.</p>
                  </div>
                </div>
              )}

              <input required type="number" step="any" placeholder="0.00 TL" value={actionForm.tutar} className="w-full p-4 rounded-2xl bg-slate-50 outline-none font-black text-lg" onChange={(e)=>setActionForm({...actionForm, tutar: e.target.value})}/>
              <textarea placeholder="Açıklama (Örn: Mayıs 2026 Kira Ödemesi)" value={actionForm.aciklama} className="w-full p-4 rounded-2xl bg-slate-50 outline-none font-bold h-24 text-sm" onChange={(e)=>setActionForm({...actionForm, aciklama: e.target.value})}/>
              <button type="submit" className="w-full bg-slate-900 text-white p-5 rounded-[1.5rem] font-black uppercase shadow-xl transition-all active:scale-95">
                Kaydet
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ekstre Detay */}
      {isEkstreModalOpen && selectedCari && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex justify-end">
          <div className="bg-white h-full w-full max-w-2xl shadow-2xl flex flex-col rounded-l-[3rem]">
            <div className="p-10 border-b flex justify-between items-center bg-slate-50 rounded-tl-[3rem]">
              <div>
                <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">{selectedCari.cari_ad}</h2>
                <div className="flex gap-2 mt-4">
                   {["Hepsi", "Borç", "Ödeme"].map(f => (
                     <button key={f} onClick={() => setEkstreFilter(f)} className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${ekstreFilter === f ? 'bg-slate-800 text-white' : 'bg-white text-slate-400 border'}`}>{f}</button>
                   ))}
                </div>
              </div>
              <button onClick={()=>setIsEkstreModalOpen(false)} className="p-4 bg-white rounded-3xl text-slate-400"><X/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-10 space-y-4">
              {filteredEkstre.map((h) => (
                <div key={h.id} className="flex items-center justify-between p-6 rounded-[2rem] border border-slate-50 bg-white shadow-sm group">
                  <div className="flex items-center gap-5">
                    <div className={`p-4 rounded-2xl ${h.islem_tipi === 'Borç' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                      {h.islem_tipi === 'Borç' ? <ArrowUpRight size={22}/> : <ArrowDownLeft size={22}/>}
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-sm uppercase">
                        {h.aciklama?.includes('[Tahakkuk]') ? 'Otomatik Tahakkuk' : h.islem_tipi === 'Borç' ? 'Harcanan/Fatura' : 'Ödenen'}
                      </p>
                      <p className="text-slate-400 text-[10px] font-bold uppercase">{new Date(h.islem_tarihi).toLocaleDateString('tr-TR')}</p>
                      {/* 👈 ESLint no-unescaped-entities hatası çözüldü (tırnaklar temizlendi) */}
                      <p className="text-slate-500 text-xs mt-1 font-medium italic">
                        {h.aciklama?.replace(/\(CH-\d+\)/g, '').trim()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`font-black text-xl tracking-tighter ${h.islem_tipi === 'Borç' ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {h.islem_tipi === 'Borç' ? '+' : '-'}{h.tutar.toLocaleString('tr-TR')} TL
                      </p>
                    </div>
                    <button 
                      onClick={() => handleActionDelete(h)}
                      className="p-2 text-slate-300 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                      title="Bu işlemi ve bağlı kayıtları sil"
                    >
                      <Trash2 size={16}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-10 bg-slate-900 text-white rounded-tl-[4rem]">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Cari Net Bakiye</p>
              <h3 className="text-5xl font-black tracking-tighter text-[#4FBCA1]">
                {(ekstreData.reduce((acc, curr) => curr.islem_tipi === 'Borç' ? acc + curr.tutar : acc - curr.tutar, 0)).toLocaleString('tr-TR')} <span className="text-lg">TL</span>
              </h3>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}