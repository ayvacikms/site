"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Wallet, 
  Search, 
  CreditCard, 
  Banknote, 
  CheckCircle2, 
  ArrowRight,
  User,
  Loader2
} from "lucide-react";

export default function OdemeAlPage() {
  const [uyeler, setUyeler] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUye, setSelectedUye] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    tutar: "",
    odeme_yontemi: "BANKA",
    tarih: new Date().toISOString().split('T')[0],
    not: ""
  });

  useEffect(() => {
    fetchUyeler();
  }, []);

  const fetchUyeler = async () => {
    const { data } = await supabase.from("uyeler").select("*").order("ad");
    setUyeler(data || []);
  };

  const handleOdemeAl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUye) return alert("Lütfen bir üye seçin!");

    setLoading(true);
    const { error } = await supabase.from("odemeler").insert([{
      uye_id: selectedUye.id,
      tutar: parseFloat(formData.tutar),
      odeme_tarihi: formData.tarih,
      odeme_yontemi: formData.odeme_yontemi,
      not: formData.not
    }]);

    if (error) {
      alert("Hata: " + error.message);
    } else {
      alert("Ödeme başarıyla kaydedildi!");
      setFormData({ 
        tutar: "", 
        odeme_yontemi: "BANKA", 
        tarih: new Date().toISOString().split('T')[0], 
        not: "" 
      });
      setSelectedUye(null);
    }
    setLoading(false);
  };

  const filteredUyeler = uyeler.filter(u => 
    u.ad.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Ödeme Tahsilatı</h1>
        <p className="text-slate-500 text-sm font-medium">Üyelerden gelen ödemeleri sisteme işleyin.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* SOL: ÜYE ARAMA VE SEÇİM (4 Kolon) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Üye ara..."
                className="w-full bg-slate-50 border-none p-3 pl-10 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#4FBCA1] transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
              {filteredUyeler.map(uye => (
                <button
                  key={uye.id}
                  onClick={() => setSelectedUye(uye)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left
                    ${selectedUye?.id === uye.id ? "bg-[#1E293B] text-white shadow-lg" : "hover:bg-slate-50 text-slate-600"}`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs
                    ${selectedUye?.id === uye.id ? "bg-[#4FBCA1]" : "bg-slate-100 text-slate-400"}`}>
                    {uye.ad[0]}
                  </div>
                  <span className="font-bold text-xs uppercase truncate">{uye.ad}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SAĞ: ÖDEME FORMU (8 Kolon) */}
        <div className="lg:col-span-8">
          {selectedUye ? (
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-[#4FBCA1] p-8 text-white">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-black uppercase opacity-80 mb-1">Ödeme Yapan Üye</p>
                    <h2 className="text-2xl font-black uppercase">{selectedUye.ad}</h2>
                  </div>
                  <User size={48} className="opacity-20" />
                </div>
              </div>

              <form onSubmit={handleOdemeAl} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Tahsil Edilen Tutar</label>
                  <div className="relative">
                    <input 
                      required
                      type="number"
                      placeholder="0.00"
                      className="w-full bg-slate-50 border-2 border-slate-50 p-4 rounded-2xl font-black text-xl outline-none focus:border-[#4FBCA1] focus:bg-white transition-all"
                      value={formData.tutar}
                      onChange={e => setFormData({...formData, tutar: e.target.value})}
                    />
                    <span className="absolute right-4 top-4 font-black text-slate-300 text-xl">₺</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Ödeme Yöntemi</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, odeme_yontemi: "BANKA"})}
                      className={`flex items-center justify-center gap-2 p-4 rounded-2xl font-bold text-xs transition-all border-2
                        ${formData.odeme_yontemi === "BANKA" ? "border-[#4FBCA1] bg-teal-50 text-[#4FBCA1]" : "border-slate-50 text-slate-400"}`}
                    >
                      <CreditCard size={18} /> BANKA
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, odeme_yontemi: "NAKİT"})}
                      className={`flex items-center justify-center gap-2 p-4 rounded-2xl font-bold text-xs transition-all border-2
                        ${formData.odeme_yontemi === "NAKİT" ? "border-[#4FBCA1] bg-teal-50 text-[#4FBCA1]" : "border-slate-50 text-slate-400"}`}
                    >
                      <Banknote size={18} /> NAKİT
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Ödeme Tarihi</label>
                  <input 
                    type="date"
                    className="w-full bg-slate-50 border-2 border-slate-50 p-4 rounded-2xl font-bold outline-none focus:border-[#4FBCA1] transition-all"
                    value={formData.tarih}
                    onChange={e => setFormData({...formData, tarih: e.target.value})}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Açıklama / Not (Opsiyonel)</label>
                  <textarea 
                    rows={2}
                    placeholder="Örn: Dekont no: 12345"
                    className="w-full bg-slate-50 border-2 border-slate-50 p-4 rounded-2xl font-bold outline-none focus:border-[#4FBCA1] transition-all"
                    value={formData.not}
                    onChange={e => setFormData({...formData, not: e.target.value})}
                  />
                </div>

                <div className="md:col-span-2 pt-4">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#1E293B] text-white py-5 rounded-[24px] font-black uppercase text-sm shadow-xl shadow-slate-200 hover:bg-[#4FBCA1] transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20} />}
                    Tahsilatı Onayla ve Kaydet
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="h-full min-h-[400px] bg-slate-50 border-4 border-dashed border-slate-100 rounded-[40px] flex flex-col items-center justify-center text-slate-300 space-y-4">
              <div className="p-6 bg-white rounded-full shadow-sm">
                <ArrowRight size={40} className="animate-pulse" />
              </div>
              <p className="font-black uppercase text-xs tracking-widest">Lütfen sol listeden bir üye seçin</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}