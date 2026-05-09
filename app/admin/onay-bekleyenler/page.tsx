"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  CheckCircle, 
  XCircle, 
  Users, // UserClock yerine Users kullanıyoruz
  Mail, 
  Phone, 
  Search,
  RefreshCw
} from "lucide-react";

export default function OnayBekleyenlerPage() {
  const [bekleyenler, setBekleyenler] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchBekleyenler();
  }, []);

  const fetchBekleyenler = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("uyeler")
      .select("*")
      .eq("aktif_mi", false)
      .order("uyelik_baslangic", { ascending: false });

    if (!error) setBekleyenler(data || []);
    setLoading(false);
  };

  const handleOnayla = async (id: string) => {
    setIsProcessing(id);
    const { error } = await supabase
      .from("uyeler")
      .update({ aktif_mi: true })
      .eq("id", id);

    if (!error) {
      setBekleyenler(prev => prev.filter(u => u.id !== id));
      alert("Üye başarıyla onaylandı.");
    }
    setIsProcessing(null);
  };

  const handleReddet = async (id: string) => {
    if (!confirm("Başvuruyu silmek istediğinize emin misiniz?")) return;
    setIsProcessing(id);
    const { error } = await supabase.from("uyeler").delete().eq("id", id);
    if (!error) setBekleyenler(prev => prev.filter(u => u.id !== id));
    setIsProcessing(null);
  };

  return (
    <div className="p-8 bg-[#f4f7f6] min-h-screen font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-800 uppercase italic tracking-tighter flex items-center gap-3">
              <Users className="text-[#1eb3a4]" size={28} /> {/* Hatalı ikon düzeltildi */}
              Üyelik Başvuruları
            </h1>
            <p className="text-gray-400 text-xs font-bold uppercase mt-1">
              Onay bekleyen toplam {bekleyenler.length} yeni başvuru var.
            </p>
          </div>
          <button onClick={fetchBekleyenler} className="p-3 bg-white border border-gray-200 rounded-2xl text-gray-500 hover:text-[#1eb3a4] transition-all">
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-20 text-center text-gray-400 font-bold uppercase italic tracking-widest text-xs">Yükleniyor...</div>
          ) : bekleyenler.length === 0 ? (
            <div className="p-20 text-center text-gray-400 font-black uppercase text-xs tracking-widest">Bekleyen başvuru yok.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="p-5 text-left">Tarih</th>
                  <th className="p-5 text-left">Üye</th>
                  <th className="p-5 text-left">İletişim</th>
                  <th className="p-5 text-center">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bekleyenler.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50">
                    <td className="p-5 font-bold text-gray-500 italic">{new Date(u.uyelik_baslangic).toLocaleDateString('tr-TR')}</td>
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#1eb3a4] text-white rounded-xl flex items-center justify-center font-black italic">{u.ad?.charAt(0)}</div>
                        <span className="font-black text-gray-800 uppercase italic tracking-tighter">{u.ad}</span>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-2 text-gray-500 font-bold text-xs"><Mail size={14} /> {u.eposta}</div>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleOnayla(u.id)} disabled={isProcessing === u.id} className="bg-teal-50 text-teal-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase flex items-center gap-2">
                          <CheckCircle size={14} /> ONAYLA
                        </button>
                        <button onClick={() => handleReddet(u.id)} disabled={isProcessing === u.id} className="bg-rose-50 text-rose-500 px-4 py-2 rounded-xl font-black text-[10px] uppercase flex items-center gap-2">
                          <XCircle size={14} /> REDDET
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}