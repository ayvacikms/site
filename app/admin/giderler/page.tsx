"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, Users, Calculator, Clock, CheckCircle2,
  Filter, Trash2, Search, History, PlusCircle, Calendar
} from "lucide-react";
import toast from "react-hot-toast";

export default function GiderlerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"yeni" | "gecmis">("yeni");
  const [uyeler, setUyeler] = useState<any[]>([]);
  const [seciliUyeIds, setSeciliUyeIds] = useState<string[]>([]);
  const [uyeSearch, setUyeSearch] = useState("");
  const [gecmisGiderler, setGecmisGiderler] = useState<any[]>([]);
  
  const [senaryo, setSenaryo] = useState<"duzenli" | "tek_sefer">("duzenli");
  const [formData, setFormData] = useState({
    baslik: "",
    toplam_maliyet: "", 
    aylik_tutar: "",     
    baslangic_tarihi: new Date().toISOString().split('T')[0],
    bitis_tarihi: "",
    son_odeme_gunu: "15", 
  });

  useEffect(() => { 
    fetchUyeler(); 
    fetchGecmisGiderler();
  }, []);

  const fetchUyeler = async () => {
    const { data } = await supabase
      .from("uyeler")
      .select("id, ad, grup_adi")
      .eq("aktif_mi", true)
      .order("ad");
    if (data) setUyeler(data);
  };

  const fetchGecmisGiderler = async () => {
    const { data } = await supabase
      .from("giderler")
      .select("*")
      .order("olusturulma", { ascending: false });
    if (data) setGecmisGiderler(data);
  };

  // ÜYE FİLTRELEME VE SEÇİM MANTIĞI
  const filteredUyeler = useMemo(() => {
    return uyeler.filter(u => u.ad.toLowerCase().includes(uyeSearch.toLowerCase()));
  }, [uyeler, uyeSearch]);

  const applySelectionFilter = (type: "all" | "sabit" | "none") => {
    if (type === "all") setSeciliUyeIds(uyeler.map(u => u.id));
    else if (type === "sabit") setSeciliUyeIds(uyeler.filter(u => u.grup_adi === "sabit").map(u => u.id));
    else setSeciliUyeIds([]);
  };

  const calculateMonths = (start: string, end: string) => {
    const d1 = new Date(start);
    const d2 = new Date(end);
    return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth()) + 1;
  };

  const handleGiderSil = async (id: string) => {
    if (!confirm("Bu borçlandırma paketini ve bağlı TÜM üye borçlarını silmek istediğinize emin misiniz?")) return;
    const { error } = await supabase.from("giderler").delete().eq("id", id);
    if (error) toast.error("Silme hatası");
    else {
      toast.success("Toplu borçlandırma iptal edildi");
      fetchGecmisGiderler();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (seciliUyeIds.length === 0) return toast.error("Lütfen üye seçiniz!");
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
            baslik: `${formData.baslik} (${borcTarihi.toLocaleString('tr-TR', { month: 'long', year: 'numeric' })})`,
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
      
      toast.success("Borçlandırma başarıyla tamamlandı!");
      setActiveTab("gecmis");
      fetchGecmisGiderler();
    } catch (err: any) {
      toast.error("Hata: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 bg-[#f8fafb] min-h-screen font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-3 bg-white rounded-2xl shadow-sm text-gray-400 hover:text-teal-600 transition-all"><ChevronLeft /></button>
            <h1 className="text-2xl font-black text-gray-800 tracking-tighter uppercase">Borç Yönetim Merkezi</h1>
          </div>
          
          <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-100">
            <button 
              onClick={() => setActiveTab("yeni")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'yeni' ? 'bg-teal-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
            >
              <PlusCircle size={16}/> Yeni Borçlandır
            </button>
            <button 
              onClick={() => setActiveTab("gecmis")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'gecmis' ? 'bg-teal-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
            >
              <History size={16}/> İşlem Geçmişi
            </button>
          </div>
        </div>

        {activeTab === "yeni" ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div onClick={() => setSenaryo("duzenli")} className={`p-6 rounded-3xl cursor-pointer border-4 transition-all ${senaryo === 'duzenli' ? 'border-teal-500 bg-teal-50 shadow-xl' : 'border-white bg-white opacity-60'}`}>
                <Clock className={senaryo === 'duzenli' ? 'text-teal-600' : 'text-gray-400'} size={32} />
                <h3 className="font-black mt-4 text-gray-800 uppercase">Düzenli (Aidat/Kira)</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">Belirli tarih aralığında her ay borç yazılır.</p>
              </div>
              <div onClick={() => setSenaryo("tek_sefer")} className={`p-6 rounded-3xl cursor-pointer border-4 transition-all ${senaryo === 'tek_sefer' ? 'border-indigo-500 bg-indigo-50 shadow-xl' : 'border-white bg-white opacity-60'}`}>
                <Calculator className={senaryo === 'tek_sefer' ? 'text-indigo-600' : 'text-gray-400'} size={32} />
                <h3 className="font-black mt-4 text-gray-800 uppercase">Eşit Paylaştırma</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">Toplam maliyet seçilen kişilere bölünür.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Gider/Aidat Başlığı</label>
                      <input required placeholder="Örn: 2026 Yılı Aidat Ödemesi" className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold text-gray-900 outline-none focus:border-teal-500" value={formData.baslik} onChange={e => setFormData({...formData, baslik: e.target.value})} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Başlangıç Tarihi</label>
                        <input type="date" required className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold text-gray-900" value={formData.baslangic_tarihi} onChange={e => setFormData({...formData, baslangic_tarihi: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Bitiş/Vade Tarihi</label>
                        <input type="date" required className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold text-gray-900" value={formData.bitis_tarihi} onChange={e => setFormData({...formData, bitis_tarihi: e.target.value})} />
                      </div>
                    </div>

                    {senaryo === 'duzenli' ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Aylık Tutar (₺)</label>
                          <input type="number" required className="w-full bg-teal-50 border-2 border-teal-100 p-4 rounded-2xl font-black text-teal-700 text-xl" value={formData.aylik_tutar} onChange={e => setFormData({...formData, aylik_tutar: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Son Ödeme Günü</label>
                          <select className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl font-bold text-gray-900 outline-none" value={formData.son_odeme_gunu} onChange={e => setFormData({...formData, son_odeme_gunu: e.target.value})}>
                            {[...Array(31)].map((_, i) => <option key={i+1} value={i+1}>{i+1}. Gün</option>)}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Toplam Paylaştırılacak Tutar (₺)</label>
                        <input type="number" required className="w-full bg-indigo-50 border-2 border-indigo-100 p-4 rounded-2xl font-black text-indigo-700 text-3xl" value={formData.toplam_maliyet} onChange={e => setFormData({...formData, toplam_maliyet: e.target.value})} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white p-6 rounded-[40px] shadow-sm border border-gray-100 h-[600px] flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-black text-gray-800 uppercase text-xs flex items-center gap-2"><Users size={16}/> Üyeler ({seciliUyeIds.length})</h3>
                    <div className="flex gap-2">
                       <button type="button" onClick={() => applySelectionFilter("all")} className="text-[9px] font-black text-teal-600 uppercase border-b border-teal-600">Tümü</button>
                       <button type="button" onClick={() => applySelectionFilter("sabit")} className="text-[9px] font-black text-orange-600 uppercase border-b border-orange-600">Sabitler</button>
                    </div>
                  </div>

                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-3 text-gray-300" size={14} />
                    <input 
                      placeholder="Üye Ara..." 
                      className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border-2 border-gray-50 rounded-xl text-xs font-bold outline-none focus:border-teal-500 focus:bg-white transition-all"
                      value={uyeSearch}
                      onChange={(e) => setUyeSearch(e.target.value)}
                    />
                  </div>

                  <div className="overflow-y-auto space-y-2 flex-1 pr-2 custom-scrollbar">
                    {filteredUyeler.map(u => (
                      <div 
                        key={u.id} 
                        onClick={() => setSeciliUyeIds(prev => prev.includes(u.id) ? prev.filter(x => x !== u.id) : [...prev, u.id])} 
                        className={`p-3 rounded-2xl border-2 cursor-pointer flex justify-between items-center transition-all ${seciliUyeIds.includes(u.id) ? 'border-teal-500 bg-teal-50' : 'border-gray-50 bg-gray-50 hover:border-gray-200'}`}
                      >
                        <div>
                          <span className={`text-[11px] font-black uppercase block ${seciliUyeIds.includes(u.id) ? 'text-teal-900' : 'text-gray-600'}`}>{u.ad}</span>
                          <span className="text-[8px] text-gray-400 font-bold uppercase">{u.grup_adi}</span>
                        </div>
                        {seciliUyeIds.includes(u.id) && <CheckCircle2 size={16} className="text-teal-600" />}
                      </div>
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={loading} className={`w-full py-6 rounded-[30px] font-black uppercase tracking-widest shadow-xl transition-all ${loading ? 'bg-gray-200' : 'bg-teal-600 text-white hover:bg-teal-700 shadow-teal-200 hover:-translate-y-1'}`}>
                  {loading ? "İŞLEM YAPILIYOR..." : "BORÇLANDIRMAYI BAŞLAT"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-8 border-b border-gray-50">
               <h3 className="font-black text-gray-800 uppercase text-sm">Yapılan Toplu Borçlandırmalar</h3>
               <p className="text-xs text-gray-400 font-bold uppercase mt-1">Buradan sildiğiniz her kayıt, üyelerin ekstrelerinden de silinir.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-4 text-[10px] font-black text-gray-400 uppercase">Başlık</th>
                    <th className="p-4 text-[10px] font-black text-gray-400 uppercase text-center">Tür</th>
                    <th className="p-4 text-[10px] font-black text-gray-400 uppercase text-center">Tutar</th>
                    <th className="p-4 text-[10px] font-black text-gray-400 uppercase text-center">Vade/Tarih</th>
                    <th className="p-4 text-[10px] font-black text-gray-400 uppercase text-center">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {gecmisGiderler.map((g) => (
                    <tr key={g.id} className="hover:bg-gray-50/50 transition-all">
                      <td className="p-4 font-bold text-gray-800 text-sm">{g.baslik}</td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${g.tur === 'sabit' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                          {g.tur === 'sabit' ? 'Aidat' : 'Ek Gider'}
                        </span>
                      </td>
                      <td className="p-4 text-center font-black text-gray-900">{g.tutar} ₺</td>
                      <td className="p-4 text-center text-xs font-bold text-gray-400 flex items-center justify-center gap-1">
                        <Calendar size={12}/> {g.son_odeme_tarihi || g.baslangic_tarihi}
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => handleGiderSil(g.id)}
                          className="p-2 text-gray-300 hover:text-red-600 transition-all"
                        >
                          <Trash2 size={18}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}