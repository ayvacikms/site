"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Megaphone, Trash2, Send, Loader2 } from "lucide-react";

export default function DuyuruYonetimi() {
  const [loading, setLoading] = useState(false);
  const [baslik, setBaslik] = useState("");
  const [icerik, setIcerik] = useState("");
  const [duyurular, setDuyurular] = useState<any[]>([]);

  useEffect(() => { fetchDuyurular(); }, []);

  const fetchDuyurular = async () => {
    const { data } = await supabase.from("duyurular").select("*").order("olusturulma_tarihi", { ascending: false });
    setDuyurular(data || []);
  };

  const duyuruEkle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("duyurular").insert([{ baslik, icerik }]);
    
    if (error) alert("Hata: " + error.message);
    else {
      setBaslik(""); setIcerik("");
      fetchDuyurular();
    }
    setLoading(false);
  };

  const duyuruSil = async (id: string) => {
    if (confirm("Duyuruyu kaldırmak istiyor musunuz?")) {
      await supabase.from("duyurular").delete().eq("id", id);
      fetchDuyurular();
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tighter mb-8">Duyuru Yönetimi</h1>
      
      <form onSubmit={duyuruEkle} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-8 space-y-4">
        <div className="flex items-center gap-2 text-teal-600 mb-2">
          <Megaphone size={20} /> <span className="font-black uppercase text-sm">Yeni Duyuru Yayınla</span>
        </div>
        <input 
          placeholder="Duyuru Başlığı"
          className="w-full bg-gray-50 border-2 border-gray-100 p-3 rounded-xl font-bold outline-none focus:border-teal-500"
          value={baslik}
          onChange={(e) => setBaslik(e.target.value)}
          required
        />
        <textarea 
          placeholder="Duyuru detayları..."
          className="w-full bg-gray-50 border-2 border-gray-100 p-3 rounded-xl font-medium outline-none focus:border-teal-500 h-32"
          value={icerik}
          onChange={(e) => setIcerik(e.target.value)}
        />
        <button 
          disabled={loading}
          className="w-full bg-teal-600 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-teal-700 transition-all flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Send size={16} />} Yayınla
        </button>
      </form>

      <div className="space-y-4">
        <h2 className="font-bold text-gray-400 text-xs uppercase tracking-widest ml-2">Geçmiş Duyurular</h2>
        {duyurular.map((d) => (
          <div key={d.id} className="bg-white p-5 rounded-2xl border border-gray-100 flex justify-between items-start">
            <div>
              <h3 className="font-black text-gray-800 uppercase">{d.baslik}</h3>
              <p className="text-gray-500 text-sm mt-1">{d.icerik}</p>
              <span className="text-[10px] text-gray-300 font-bold mt-2 block italic">
                {new Date(d.olusturulma_tarihi).toLocaleDateString('tr-TR')}
              </span>
            </div>
            <button onClick={() => duyuruSil(d.id)} className="text-gray-300 hover:text-red-500 transition-colors p-2">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}