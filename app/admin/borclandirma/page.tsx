"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Send, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  CalendarDays
} from "lucide-react";

export default function BorclandirmaPage() {
  const [uyeler, setUyeler] = useState<any[]>([]);
  const [selectedUyeler, setSelectedUyeler] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  const [formData, setFormData] = useState({
    aciklama: "",
    tutar: "",
    tarih: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchUyeler();
  }, []);

  const fetchUyeler = async () => {
    const { data } = await supabase.from("uyeler").select("id, ad, eposta").order("ad");
    setUyeler(data || []);
    setFetching(false);
  };

  const handleSelectAll = () => {
    if (selectedUyeler.length === uyeler.length) setSelectedUyeler([]);
    else setSelectedUyeler(uyeler.map(u => u.id));
  };

  const handleSelectUye = (id: string) => {
    setSelectedUyeler(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUyeler.length === 0) return alert("Lütfen en az bir üye seçin!");
    
    setLoading(true);
    
    // Toplu borçlandırma verisi hazırlama
    const inserts = selectedUyeler.map(uyeId => ({
      uye_id: uyeId,
      borc_tutari: parseFloat(formData.tutar),
      aciklama: formData.aciklama,
      borc_tarih: formData.tarih
    }));

    const { error } = await supabase.from("gider_uyeler").insert(inserts);

    if (error) {
      alert("Hata oluştu: " + error.message);
    } else {
      alert(`${selectedUyeler.length} üye başarıyla borçlandırıldı!`);
      setFormData({ aciklama: "", tutar: "", tarih: new Date().toISOString().split('T')[0] });
      setSelectedUyeler([]);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Toplu Borçlandırma</h1>
          <p className="text-slate-500 text-sm font-medium">Üyelere aidat veya ek gider tanımlayın.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* SOL: FORM AYARLARI */}
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4 sticky top-24">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Borç Açıklaması</label>
              <input 
                required
                placeholder="Örn: Haziran 2026 Aidatı"
                className="w-full bg-slate-50 border-2 border-slate-50 p-3 rounded-xl font-bold outline-none focus:border-[#4FBCA1] focus:bg-white transition-all"
                value={formData.aciklama}
                onChange={e => setFormData({...formData, aciklama: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Tutar (₺)</label>
              <input 
                required
                type="number"
                placeholder="0.00"
                className="w-full bg-slate-50 border-2 border-slate-50 p-3 rounded-xl font-bold outline-none focus:border-[#4FBCA1] focus:bg-white transition-all"
                value={formData.tutar}
                onChange={e => setFormData({...formData, tutar: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Vade / Kayıt Tarihi</label>
              <div className="relative">
                <input 
                  type="date"
                  className="w-full bg-slate-50 border-2 border-slate-50 p-3 rounded-xl font-bold outline-none focus:border-[#4FBCA1] focus:bg-white transition-all"
                  value={formData.tarih}
                  onChange={e => setFormData({...formData, tarih: e.target.value})}
                />
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-[#1E293B] text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-[#4FBCA1] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Send size={18} />}
                Borçlandırmayı Başlat
              </button>
            </div>
          </form>
        </div>

        {/* SAĞ: ÜYE SEÇİMİ */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-700 uppercase text-xs tracking-tighter flex items-center gap-2">
                <Users size={16}/> Üye Listesi ({selectedUyeler.length} seçili)
              </h3>
              <button 
                onClick={handleSelectAll}
                className="text-[10px] font-black text-[#4FBCA1] uppercase border-b-2 border-[#4FBCA1] leading-none pb-1"
              >
                {selectedUyeler.length === uyeler.length ? "Seçimi Kaldır" : "Tümünü Seç"}
              </button>
            </div>
            <div className="max-h-[600px] overflow-y-auto p-4 space-y-2">
              {fetching ? (
                <div className="text-center py-10 text-slate-400 font-bold">Üyeler yükleniyor...</div>
              ) : uyeler.map(uye => (
                <div 
                  key={uye.id}
                  onClick={() => handleSelectUye(uye.id)}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer
                    ${selectedUyeler.includes(uye.id) 
                      ? "border-[#4FBCA1] bg-teal-50/30" 
                      : "border-slate-50 hover:border-slate-200"}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs
                      ${selectedUyeler.includes(uye.id) ? "bg-[#4FBCA1] text-white" : "bg-slate-100 text-slate-400"}`}>
                      {uye.ad[0]}
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-700 text-sm uppercase">{uye.ad}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{uye.eposta}</p>
                    </div>
                  </div>
                  {selectedUyeler.includes(uye.id) && <CheckCircle2 className="text-[#4FBCA1]" size={20} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}