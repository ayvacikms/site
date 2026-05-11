"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Plus, Search, Building2, Phone, FileText, Trash2, 
  Edit, ArrowUpRight, ArrowDownLeft, X, Landmark, Wallet, Banknote 
} from "lucide-react";
import toast from "react-hot-toast";

export default function CarilerPage() {
  const [cariler, setCariler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modallar
  const [isCariModalOpen, setIsCariModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isEkstreModalOpen, setIsEkstreModalOpen] = useState(false);

  // Seçili Veriler
  const [selectedCari, setSelectedCari] = useState(null);
  const [ekstreData, setEkstreData] = useState([]);
  
  // Form State'leri
  const [cariForm, setCariForm] = useState({ id: null, cari_ad: "", yetkili_kisi: "", telefon: "", kategori: "Genel" });
  const [actionForm, setActionForm] = useState({ tip: "Borç", tutar: "", odemeYontemi: "Banka/EFT", aciklama: "" });

  useEffect(() => {
    fetchCariler();
  }, []);

  const fetchCariler = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("cariler").select("*").order("cari_ad", { ascending: true });
    if (error) toast.error("Veriler yüklenemedi");
    else setCariler(data || []);
    setLoading(false);
  };

  // --- CARİ CRUD İŞLEMLERİ ---
  const handleCariSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...cariForm };
    const cariId = payload.id;
    delete payload.id;

    if (cariId) {
      const { error } = await supabase.from("cariler").update(payload).eq("id", cariId);
      if (error) toast.error("Güncellenemedi");
      else toast.success("Cari güncellendi");
    } else {
      const { error } = await supabase.from("cariler").insert([payload]);
      if (error) toast.error("Eklenemedi");
      else toast.success("Cari eklendi");
    }
    setIsCariModalOpen(false);
    fetchCariler();
  };

  const deleteCari = async (id) => {
    if (!confirm("Bu cariyi silmek istediğinize emin misiniz? Tüm hareketleri de silinecektir.")) return;
    const { error } = await supabase.from("cariler").delete().eq("id", id);
    if (error) toast.error("Silinemedi");
    else { toast.success("Cari silindi"); fetchCariler(); }
  };

  // --- HAREKET (BORÇ/ÖDEME) İŞLEMİ ---
  const handleActionSubmit = async (e) => {
    e.preventDefault();
    const tutarNum = parseFloat(actionForm.tutar);

    try {
      // 1. Cari Hareket Kaydı
      const { data: hareket, error: hError } = await supabase
        .from("cari_hareketler")
        .insert([{
          cari_id: selectedCari.id,
          islem_tipi: actionForm.tip,
          tutar: tutarNum,
          aciklama: actionForm.aciklama
        }]).select().single();

      if (hError) throw hError;

      // 2. Eğer "Ödeme" ise Kasadan Düş (Gider/Çıkış)
      if (actionForm.tip === "Ödeme") {
        const { error: kError } = await supabase.from("kasa_hareketler").insert([{
          islem_tipi: "Çıkış",
          odeme_yontemi: actionForm.odemeYontemi,
          tutar: tutarNum,
          aciklama: `${selectedCari.cari_ad} - Ödeme: ${actionForm.aciklama}`,
          cari_id: selectedCari.id // Kasada hangi cariye ödendiğini görmek için
        }]);
        if (kError) toast.error("Kasa hareketi işlenemedi!");
      } 
      // 3. Eğer "Borç" değil de direkt Kasaya "Giriş" yansıması gerekiyorsa buraya eklenebilir.
      // Genelde "Harcama/Borç" kasayı etkilemez, sadece cari bakiye artar.

      toast.success("İşlem her iki deftere de kaydedildi");
      setIsActionModalOpen(false);
      setActionForm({ tip: "Borç", tutar: "", odemeYontemi: "Banka/EFT", aciklama: "" });
      fetchCariler(); // Bakiyeler güncellenmiş olabilir
    } catch (err) {
      toast.error("İşlem kaydedilemedi");
    }
  };

  // --- EKSTRE GÖRÜNTÜLEME ---
  const openEkstre = async (cari) => {
    setSelectedCari(cari);
    const { data, error } = await supabase
      .from("cari_hareketler")
      .select("*")
      .eq("cari_id", cari.id)
      .order("islem_tarihi", { ascending: false });
    
    if (error) toast.error("Ekstre alınamadı");
    else {
      setEkstreData(data || []);
      setIsEkstreModalOpen(true);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Üst Başlık */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Cari ve Esnaf Yönetimi</h1>
          <p className="text-slate-500 font-bold text-xs uppercase opacity-70">Kurumsal harcamalar ve kasa entegrasyonu</p>
        </div>
        <button 
          onClick={() => { setCariForm({ id: null, cari_ad: "", yetkili_kisi: "", telefon: "", kategori: "Genel" }); setIsCariModalOpen(true); }}
          className="bg-[#1E293B] text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl"
        >
          <Plus size={18} /> YENİ CARİ EKLE
        </button>
      </div>

      {/* Arama Barı */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
        <div className="bg-slate-100 p-2 rounded-xl text-slate-400">
          <Search size={20} />
        </div>
        <input 
          type="text" 
          placeholder="Cari adı veya yetkili ara..."
          className="flex-1 outline-none text-slate-600 bg-transparent font-bold h-10"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Cari Kartları Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
           <div className="col-span-full py-20 text-center font-bold text-slate-400 animate-pulse uppercase tracking-widest">Veriler yükleniyor...</div>
        ) : (
          cariler.filter(c => c.cari_ad.toLowerCase().includes(searchTerm.toLowerCase())).map((cari) => (
            <div key={cari.id} className="bg-white rounded-[2.5rem] border border-slate-200 p-6 hover:border-[#4FBCA1] transition-all group relative overflow-hidden shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-[#4FBCA1] group-hover:text-white transition-all">
                  <Building2 size={24} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setCariForm(cari); setIsCariModalOpen(true); }} className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"><Edit size={16}/></button>
                  <button onClick={() => deleteCari(cari.id)} className="p-2 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"><Trash2 size={16}/></button>
                </div>
              </div>

              <h3 className="font-black text-slate-800 text-lg mb-1 uppercase tracking-tighter">{cari.cari_ad}</h3>
              <p className="text-slate-400 text-[10px] font-black uppercase mb-4 tracking-wider">{cari.yetkili_kisi || "Yetkili Tanımsız"}</p>

              <div className="flex items-center gap-2 text-slate-500 text-sm font-bold mb-6 bg-slate-50 p-2 rounded-xl">
                <Phone size={14} className="text-slate-300"/> {cari.telefon || "-"}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-50">
                <button 
                  onClick={() => { setSelectedCari(cari); setIsActionModalOpen(true); }}
                  className="bg-slate-900 text-white py-3 rounded-xl font-black text-[10px] uppercase hover:bg-slate-700 transition-all tracking-widest"
                >
                  İŞLEM YAP
                </button>
                <button 
                  onClick={() => openEkstre(cari)}
                  className="bg-[#4FBCA1]/10 text-[#4FBCA1] py-3 rounded-xl font-black text-[10px] uppercase hover:bg-[#4FBCA1] hover:text-white transition-all tracking-widest"
                >
                  EKSTRE GÖR
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL: CARİ EKLE/GÜNCELLE */}
      {isCariModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{cariForm.id ? 'Cari Güncelle' : 'Yeni Cari Kaydı'}</h2>
              <button onClick={() => setIsCariModalOpen(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"><X/></button>
            </div>
            <form onSubmit={handleCariSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Cari / Firma Adı</label>
                <input required value={cariForm.cari_ad} className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none font-bold text-sm mt-1" onChange={(e)=>setCariForm({...cariForm, cari_ad: e.target.value})}/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Yetkili Kişi</label>
                  <input value={cariForm.yetkili_kisi} className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none font-bold text-sm mt-1" onChange={(e)=>setCariForm({...cariForm, yetkili_kisi: e.target.value})}/>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Telefon</label>
                  <input value={cariForm.telefon} className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none font-bold text-sm mt-1" onChange={(e)=>setCariForm({...cariForm, telefon: e.target.value})}/>
                </div>
              </div>
              <button type="submit" className="w-full bg-[#4FBCA1] text-white p-5 rounded-2xl font-black uppercase shadow-xl shadow-[#4FBCA1]/20 tracking-widest mt-2 transition-transform active:scale-95">
                {cariForm.id ? 'GÜNCELLEMEYİ KAYDET' : 'CARİYİ OLUŞTUR'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: İŞLEM YAP (HARCAMA/ÖDEME) */}
      {isActionModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl relative">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Cari Hareket Ekle</h2>
                <p className="text-[#4FBCA1] text-[10px] font-black uppercase tracking-widest">{selectedCari?.cari_ad}</p>
              </div>
              <button onClick={() => setIsActionModalOpen(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors">
                <X size={20}/>
              </button>
            </div>

            <form onSubmit={handleActionSubmit} className="space-y-5">
              <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                {['Borç', 'Ödeme'].map(t => (
                  <button key={t} type="button" onClick={() => setActionForm({...actionForm, tip: t})} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${actionForm.tip === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>
                    {t === 'Borç' ? '💸 Harcama (Borç)' : '✅ Ödeme Yap'}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">İşlem Tutarı (TL)</label>
                <input required type="number" step="0.01" className="w-full p-5 rounded-2xl bg-slate-50 border-none outline-none font-black text-3xl text-slate-800 mt-1" placeholder="0.00" onChange={(e)=>setActionForm({...actionForm, tutar: e.target.value})}/>
              </div>

              {actionForm.tip === 'Ödeme' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Ödeme Kaynağı (Kasa Etkilenir)</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button 
                      type="button" 
                      onClick={() => setActionForm({...actionForm, odemeYontemi: "Banka/EFT"})}
                      className={`p-4 rounded-2xl border-2 font-bold text-xs flex flex-col items-center gap-2 transition-all ${actionForm.odemeYontemi === 'Banka/EFT' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-400'}`}
                    >
                      <Landmark size={20}/> BANKA / EFT
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setActionForm({...actionForm, odemeYontemi: "Nakit"})}
                      className={`p-4 rounded-2xl border-2 font-bold text-xs flex flex-col items-center gap-2 transition-all ${actionForm.odemeYontemi === 'Nakit' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-100 text-slate-400'}`}
                    >
                      <Banknote size={20}/> NAKİT KASA
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Açıklama / Not</label>
                <textarea placeholder="Fatura no, detay vb..." className="w-full p-4 rounded-2xl bg-slate-50 border-none outline-none font-bold h-24 text-sm mt-1" onChange={(e)=>setActionForm({...actionForm, aciklama: e.target.value})}/>
              </div>

              <button type="submit" className="w-full bg-[#1E293B] text-white p-5 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-95">
                İŞLEMİ ONAYLA VE KAYDET
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EKSTRE DETAY */}
      {isEkstreModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-end">
          <div className="bg-white h-full w-full max-w-2xl shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">{selectedCari?.cari_ad}</h2>
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Tarih Bazlı Hareket Ekstresi</p>
              </div>
              <button onClick={()=>setIsEkstreModalOpen(false)} className="p-3 bg-white rounded-2xl shadow-sm text-slate-400 hover:text-slate-800 transition-all"><X/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-white">
              {ekstreData.length === 0 ? (
                <div className="text-center py-20 text-slate-300 font-black uppercase text-[10px] tracking-widest italic">Henüz bir hareket kaydı bulunmuyor.</div>
              ) : (
                ekstreData.map((h) => (
                  <div key={h.id} className="flex items-center justify-between p-5 rounded-[2rem] border border-slate-50 hover:bg-slate-50/50 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl transition-transform group-hover:scale-110 ${h.islem_tipi === 'Borç' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                        {h.islem_tipi === 'Borç' ? <ArrowUpRight size={20}/> : <ArrowDownLeft size={20}/>}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-sm uppercase tracking-tight">{h.islem_tipi === 'Borç' ? 'Harcama / Borç' : 'Yapılan Ödeme'}</p>
                        <p className="text-slate-400 text-[9px] font-black uppercase">{new Date(h.islem_tarihi).toLocaleDateString('tr-TR')}</p>
                        <p className="text-slate-500 text-xs mt-1 font-medium italic">{h.aciklama}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-black text-lg tracking-tighter ${h.islem_tipi === 'Borç' ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {h.islem_tipi === 'Borç' ? '-' : '+'}{h.tutar.toLocaleString('tr-TR')} TL
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-8 bg-slate-900 text-white rounded-t-[3rem] shadow-2xl">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Güncel Cari Bakiye</p>
                  <h3 className="text-4xl font-black tracking-tighter">
                    {(ekstreData.reduce((acc, curr) => curr.islem_tipi === 'Borç' ? acc + curr.tutar : acc - curr.tutar, 0)).toLocaleString('tr-TR')} TL
                  </h3>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-[9px] font-black text-slate-500 uppercase leading-relaxed max-w-[180px]">
                    BORÇLU OLDUĞUNUZ TOPLAM TUTARI GÖSTERİR. EKSİ DEĞERLER FAZLA ÖDEME YAPILDIĞI ANLAMINA GELİR.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}