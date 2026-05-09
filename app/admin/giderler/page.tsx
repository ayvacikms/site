"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, 
  CalendarDays, 
  Users, 
  Calculator, 
  Clock, 
  Settings2,
  CheckCircle2
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
    const { data } = await supabase.from("uyeler").select("id, ad").eq("aktif_mi", true).order("ad");
    if (data) setUyeler(data);
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

          // 1. Gider Kaydı
          const { data: gider, error: giderErr } = await supabase.from("giderler").insert([{
            baslik: `${formData.baslik} - ${borcTarihi.toLocaleString('tr-TR', { month: 'long', year: 'numeric' })}`,
            tur: 'sabit',
            tutar: parseFloat(formData.aylik_tutar),
            baslangic_tarihi: borcTarihi.toISOString().split('T')[0],
            son_odeme_tarihi: sonOdemeTarihi.toISOString().split('T')[0]
          }]).select().maybeSingle(); // .single() yerine .maybeSingle() daha güvenlidir

          if (giderErr || !gider) {
            throw new Error(`Gider oluşturulurken hata: ${giderErr?.message || "Veri dönmedi"}`);
          }

          // 2. Üye Borçlandırma
          const borclar = seciliUyeIds.map(id => ({
            gider_id: gider.id,
            uye_id: id,
            borc_tutari: parseFloat(formData.aylik_tutar),
            borc_tarih: borcTarihi.toISOString().split('T')[0],
            durum: 'odenmedi',
            odendi: false
          }));

          const { error: borcErr } = await supabase.from("gider_uyeler").insert(borclar);
          if (borcErr) throw borcErr;
        }
      } else {
        // --- SENARYO 2: TEK SEFERLİK EŞİT PAYLAŞTIRMA ---
        const toplam = parseFloat(formData.toplam_maliyet);
        const kisiBasi = toplam / seciliUyeIds.length;
        
        const { data: gider, error: giderErr } = await supabase.from("giderler").insert([{
          baslik: formData.baslik,
          tur: 'degisken',
          tutar: toplam, // Toplam maliyeti gider tablosuna yazıyoruz
          baslangic_tarihi: formData.baslangic_tarihi,
          son_odeme_tarihi: formData.bitis_tarihi 
        }]).select().maybeSingle();

        if (giderErr || !gider) {
          throw new Error(`Gider oluşturulurken hata: ${giderErr?.message || "Veri dönmedi"}`);
        }

        const borclar = seciliUyeIds.map(id => ({
          gider_id: gider.id,
          uye_id: id,
          borc_tutari: kisiBasi,
          borc_tarih: formData.baslangic_tarihi,
          durum: 'odenmedi',
          odendi: false
        }));

        const { error: borcErr } = await supabase.from("gider_uyeler").insert(borclar);
        if (borcErr) throw borcErr;
      }
      
      alert("İşlem başarıyla tamamlandı!");
      router.push("/giderler");
    } catch (err: any) {
      console.error("Detaylı Hata:", err);
      alert("Hata oluştu: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 bg-[#f8fafb] min-h-screen font-sans">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.back()} className="p-3 bg-white rounded-2xl shadow-sm text-gray-400 hover:text-teal-600 transition-all"><ChevronLeft /></button>
          <h1 className="text-2xl font-black text-gray-800 tracking-tighter uppercase">Borçlandırma Sihirbazı</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div 
            onClick={() => setSenaryo("duzenli")}
            className={`p-6 rounded-3xl cursor-pointer border-4 transition-all ${senaryo === 'duzenli' ? 'border-teal-500 bg-teal-50 shadow-xl shadow-teal-100' : 'border-white bg-white opacity-60'}`}
          >
            <Clock className={senaryo === 'duzenli' ? 'text-teal-600' : 'text-gray-400'} size={32} />
            <h3 className="font-black mt-4 text-gray-800 uppercase">Düzenli Borçlandırma</h3>
            <p className="text-xs font-bold text-gray-500 mt-1">Kira, aidat gibi her ay tekrarlanan ödemeler.</p>
          </div>
          <div 
            onClick={() => setSenaryo("tek_sefer")}
            className={`p-6 rounded-3xl cursor-pointer border-4 transition-all ${senaryo === 'tek_sefer' ? 'border-indigo-500 bg-indigo-50 shadow-xl shadow-indigo-100' : 'border-white bg-white opacity-60'}`}
          >
            <Calculator className={senaryo === 'tek_sefer' ? 'text-indigo-600' : 'text-gray-400'} size={32} />
            <h3 className="font-black mt-4 text-gray-800 uppercase">Eşit Paylaştırma</h3>
            <p className="text-xs font-bold text-gray-500 mt-1">Organizasyon veya tamirat gibi tek seferlik giderler.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Gider Açıklaması</label>
                  <input required placeholder="Örn: 2024 Yılı Kira Bedeli" className="w-full bg-gray-50 border-2 border-gray-50 p-4 rounded-2xl font-bold outline-none focus:border-teal-500 transition-all" value={formData.baslik} onChange={e => setFormData({...formData, baslik: e.target.value})} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Başlangıç Tarihi</label>
                    <input type="date" required className="w-full bg-gray-50 border-2 border-gray-50 p-4 rounded-2xl font-bold outline-none focus:border-teal-500" value={formData.baslangic_tarihi} onChange={e => setFormData({...formData, baslangic_tarihi: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">{senaryo === 'duzenli' ? 'Bitiş Tarihi' : 'Son Ödeme Tarihi'}</label>
                    <input type="date" required className="w-full bg-gray-50 border-2 border-gray-50 p-4 rounded-2xl font-bold outline-none focus:border-teal-500" value={formData.bitis_tarihi} onChange={e => setFormData({...formData, bitis_tarihi: e.target.value})} />
                  </div>
                </div>

                {senaryo === 'duzenli' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Aylık Kişi Başı Tutar</label>
                      <input type="number" required placeholder="₺ 0.00" className="w-full bg-teal-50/50 border-2 border-teal-100 p-4 rounded-2xl font-black text-teal-700 text-xl outline-none" value={formData.aylik_tutar} onChange={e => setFormData({...formData, aylik_tutar: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Son Ödeme Günü (Her ay)</label>
                      <select className="w-full bg-gray-50 border-2 border-gray-50 p-4 rounded-2xl font-bold outline-none" value={formData.son_odeme_gunu} onChange={e => setFormData({...formData, son_odeme_gunu: e.target.value})}>
                        {[...Array(31)].map((_, i) => <option key={i+1} value={i+1}>{i+1}. Gün</option>)}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Toplam Harcama Tutarı</label>
                    <input type="number" required placeholder="₺ 0.00" className="w-full bg-indigo-50/50 border-2 border-indigo-100 p-4 rounded-2xl font-black text-indigo-700 text-3xl outline-none" value={formData.toplam_maliyet} onChange={e => setFormData({...formData, toplam_maliyet: e.target.value})} />
                    <p className="text-[10px] font-bold text-indigo-400 mt-2 uppercase tracking-tighter">Sistem bu tutarı seçili üyelere eşit olarak paylaştıracaktır.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-[40px] shadow-sm border border-gray-100 h-[400px] overflow-hidden flex flex-col">
              <h3 className="font-black text-gray-800 uppercase text-xs mb-4 flex items-center gap-2"><Users size={16}/> Üye Seçimi ({seciliUyeIds.length})</h3>
              <div className="overflow-y-auto space-y-2 pr-2 custom-scrollbar flex-1">
                {uyeler.map(u => (
                  <div key={u.id} onClick={() => setSeciliUyeIds(prev => prev.includes(u.id) ? prev.filter(x => x !== u.id) : [...prev, u.id])} className={`p-4 rounded-2xl border-2 cursor-pointer flex justify-between items-center transition-all ${seciliUyeIds.includes(u.id) ? 'border-teal-500 bg-teal-50' : 'border-gray-50 bg-gray-50'}`}>
                    <span className="text-xs font-black uppercase tracking-tighter">{u.ad}</span>
                    {seciliUyeIds.includes(u.id) && <CheckCircle2 size={18} className="text-teal-600" />}
                  </div>
                ))}
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading || !formData.baslangic_tarihi || !formData.bitis_tarihi}
              className={`w-full py-6 rounded-[30px] font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95 ${loading ? 'bg-gray-200 text-gray-400' : senaryo === 'duzenli' ? 'bg-teal-600 text-white shadow-teal-200 hover:bg-teal-700' : 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700'}`}
            >
              {loading ? "İŞLEM YAPILIYOR..." : "BORÇLANDIRMAYI BAŞLAT"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}