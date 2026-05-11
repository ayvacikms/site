"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, 
  Users, 
  Calculator, 
  Clock, 
  CheckCircle2,
  Filter,
  Trash2
} from "lucide-react";

export default function YeniGiderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uyeler, setUyeler] = useState<any[]>([]);
  const [seciliUyeIds, setSeciliUyeIds] = useState<string[]>([]);
  
  const [senaryo, setSenaryo] = useState<"duzenli" | "tek_sefer">("duzenli");
  const [formData, setFormData] = useState({
    baslik: "",
    toplam_maliyet: "", 
    aylik_tutar: "",    
    baslangic_tarihi: "",
    bitis_tarihi: "",
    son_odeme_gunu: "15", 
  });

  useEffect(() => { fetchUyeler(); }, []);

  const fetchUyeler = async () => {
    // grup_adi kolonunu da çekiyoruz
    const { data } = await supabase
      .from("uyeler")
      .select("id, ad, grup_adi")
      .eq("aktif_mi", true)
      .order("ad");
    if (data) setUyeler(data);
  };

  // PROFESYONEL FİLTRELEME FONKSİYONU
  const applyFilter = (type: "all" | "sabit" | "none") => {
    if (type === "all") {
      setSeciliUyeIds(uyeler.map(u => u.id));
    } else if (type === "sabit") {
      const sabitler = uyeler.filter(u => u.grup_adi === "sabit").map(u => u.id);
      setSeciliUyeIds(sabitler);
    } else {
      setSeciliUyeIds([]);
    }
  };

  const calculateMonths = (start: string, end: string) => {
    const d1 = new Date(start);
    const d2 = new Date(end);
    return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth()) + 1;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (seciliUyeIds.length === 0) return alert("Üye seçmediniz!");
    setLoading(true);

    try {
      if (senaryo === "duzenli") {
        const aySayisi = calculateMonths(formData.baslangic_tarihi, formData.bitis_tarihi);
        
        for (let i = 0; i < aySayisi; i++) {
          const borcTarihi = new Date(formData.baslangic_tarihi);
          borcTarihi.setMonth(borcTarihi.getMonth() + i);
          
          const sonOdemeTarihi = new Date(borcTarihi);
          sonOdemeTarihi.setDate(parseInt(formData.son_odeme_gunu));

          const { data: gider, error: giderErr } = await supabase.from("giderler").insert([{
            baslik: `${formData.baslik} - ${borcTarihi.toLocaleString('tr-TR', { month: 'long', year: 'numeric' })}`,
            tur: 'sabit',
            tutar: parseFloat(formData.aylik_tutar),
            baslangic_tarihi: borcTarihi.toISOString().split('T')[0],
            son_odeme_tarihi: sonOdemeTarihi.toISOString().split('T')[0]
          }]).select().maybeSingle();

          if (giderErr || !gider) throw new Error(giderErr?.message);

          const borclar = seciliUyeIds.map(id => ({
            gider_id: gider.id,
            uye_id: id,
            borc_tutari: parseFloat(formData.aylik_tutar),
            borc_tarih: borcTarihi.toISOString().split('T')[0],
            durum: 'odenmedi',
            odendi: false
          }));

          await supabase.from("gider_uyeler").insert(borclar);
        }
      } else {
        const toplam = parseFloat(formData.toplam_maliyet);
        const kisiBasi = toplam / seciliUyeIds.length;
        
        const { data: gider, error: giderErr } = await supabase.from("giderler").insert([{
          baslik: formData.baslik,
          tur: 'degisken',
          tutar: toplam,
          baslangic_tarihi: formData.baslangic_tarihi,
          son_odeme_tarihi: formData.bitis_tarihi 
        }]).select().maybeSingle();

        if (giderErr || !gider) throw new Error(giderErr?.message);

        const borclar = seciliUyeIds.map(id => ({
          gider_id: gider.id,
          uye_id: id,
          borc_tutari: kisiBasi,
          borc_tarih: formData.baslangic_tarihi,
          durum: 'odenmedi',
          odendi: false
        }));

        await supabase.from("gider_uyeler").insert(borclar);
      }
      
      alert("İşlem başarıyla tamamlandı!");
      router.push("/admin/borclandirma");
    } catch (err: any) {
      alert("Hata: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 bg-[#f8fafb] min-h-screen font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.back()} className="p-3 bg-white rounded-2xl shadow-sm text-gray-400 hover:text-teal-600 transition-all"><ChevronLeft /></button>
          <h1 className="text-2xl font-black text-gray-800 tracking-tighter uppercase">Borçlandırma Sihirbazı</h1>
        </div>

        {/* SENARYO SEÇİMİ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div onClick={() => setSenaryo("duzenli")} className={`p-6 rounded-3xl cursor-pointer border-4 transition-all ${senaryo === 'duzenli' ? 'border-teal-500 bg-teal-50 shadow-xl' : 'border-white bg-white opacity-60'}`}>
            <Clock className={senaryo === 'duzenli' ? 'text-teal-600' : 'text-gray-400'} size={32} />
            <h3 className="font-black mt-4 text-gray-800 uppercase">Düzenli (Aidat/Kira)</h3>
          </div>
          <div onClick={() => setSenaryo("tek_sefer")} className={`p-6 rounded-3xl cursor-pointer border-4 transition-all ${senaryo === 'tek_sefer' ? 'border-indigo-500 bg-indigo-50 shadow-xl' : 'border-white bg-white opacity-60'}`}>
            <Calculator className={senaryo === 'tek_sefer' ? 'text-indigo-600' : 'text-gray-400'} size={32} />
            <h3 className="font-black mt-4 text-gray-800 uppercase">Eşit Paylaştırma</h3>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* SOL KOLON: FORM BİLGİLERİ */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Gider Açıklaması</label>
                  <input required className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold text-gray-900 outline-none focus:border-teal-500" value={formData.baslik} onChange={e => setFormData({...formData, baslik: e.target.value})} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Başlangıç</label>
                    <input type="date" required className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold text-gray-900" value={formData.baslangic_tarihi} onChange={e => setFormData({...formData, baslangic_tarihi: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Bitiş/Vade</label>
                    <input type="date" required className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold text-gray-900" value={formData.bitis_tarihi} onChange={e => setFormData({...formData, bitis_tarihi: e.target.value})} />
                  </div>
                </div>

                {senaryo === 'duzenli' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Aylık Tutar</label>
                      <input type="number" required className="w-full bg-teal-50 border-2 border-teal-100 p-4 rounded-2xl font-black text-teal-700 text-xl" value={formData.aylik_tutar} onChange={e => setFormData({...formData, aylik_tutar: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Ödeme Günü</label>
                      <select className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold text-gray-900" value={formData.son_odeme_gunu} onChange={e => setFormData({...formData, son_odeme_gunu: e.target.value})}>
                        {[...Array(31)].map((_, i) => <option key={i+1} value={i+1}>{i+1}. Gün</option>)}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Toplam Maliyet</label>
                    <input type="number" required className="w-full bg-indigo-50 border-2 border-indigo-100 p-4 rounded-2xl font-black text-indigo-700 text-3xl" value={formData.toplam_maliyet} onChange={e => setFormData({...formData, toplam_maliyet: e.target.value})} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SAĞ KOLON: ÜYE SEÇİMİ VE FİLTRELEME */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-[40px] shadow-sm border border-gray-100 h-[500px] flex flex-col">
              <h3 className="font-black text-gray-800 uppercase text-xs mb-4 flex items-center gap-2"><Users size={16}/> Üyeler ({seciliUyeIds.length})</h3>
              
              {/* PROFESYONEL FİLTRE BUTONLARI */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <button type="button" onClick={() => applyFilter("all")} className="py-2 text-[9px] font-black border-2 border-gray-100 rounded-xl hover:bg-gray-50 uppercase">Tümü</button>
                <button type="button" onClick={() => applyFilter("sabit")} className="py-2 text-[9px] font-black border-2 border-teal-100 text-teal-600 rounded-xl hover:bg-teal-50 uppercase flex items-center justify-center gap-1"><Filter size={10}/> Sabitler</button>
                <button type="button" onClick={() => applyFilter("none")} className="py-2 text-[9px] font-black border-2 border-red-50 text-red-400 rounded-xl hover:bg-red-50 uppercase flex items-center justify-center gap-1"><Trash2 size={10}/> Temizle</button>
              </div>

              <div className="overflow-y-auto space-y-2 flex-1 pr-2 custom-scrollbar">
                {uyeler.map(u => (
                  <div 
                    key={u.id} 
                    onClick={() => setSeciliUyeIds(prev => prev.includes(u.id) ? prev.filter(x => x !== u.id) : [...prev, u.id])} 
                    className={`p-4 rounded-2xl border-2 cursor-pointer flex justify-between items-center transition-all ${seciliUyeIds.includes(u.id) ? 'border-teal-500 bg-teal-50' : 'border-gray-50 bg-gray-50'}`}
                  >
                    <div>
                      <span className={`text-[11px] font-black uppercase block ${seciliUyeIds.includes(u.id) ? 'text-teal-900' : 'text-gray-600'}`}>{u.ad}</span>
                      <span className="text-[8px] text-gray-400 font-bold uppercase">{u.grup_adi}</span>
                    </div>
                    {seciliUyeIds.includes(u.id) && <CheckCircle2 size={18} className="text-teal-600" />}
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading} className={`w-full py-6 rounded-[30px] font-black uppercase tracking-widest shadow-xl transition-all ${loading ? 'bg-gray-200' : 'bg-teal-600 text-white hover:bg-teal-700 shadow-teal-200'}`}>
              {loading ? "İŞLEM YAPILIYOR..." : "BORÇLANDIRMAYI BAŞLAT"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
