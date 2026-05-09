"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Printer, Wallet, CheckCircle2, X, Calendar } from "lucide-react";

export default function UyeEkstresiPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [uye, setUye] = useState<any>(null);
  const [borclar, setBorclar] = useState<any[]>([]);
  const [odemeler, setOdemeler] = useState<any[]>([]);
  
  // Filtre ve Modal State'leri
  const [basTarih, setBasTarih] = useState("");
  const [bitTarih, setBitTarih] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [odemeTutar, setOdemeTutar] = useState("");

  useEffect(() => {
    if (id) fetchVeriler();
  }, [id]);

  const fetchVeriler = async (f_bas?: string, f_bit?: string) => {
    setLoading(true);
    
    // 1. Üye Bilgisi
    const { data: uyeData } = await supabase.from("uyeler").select("*").eq("id", id).single();
    setUye(uyeData);

    // 2. Tarih Filtre Mantığı
    const bugun = new Date();
    const buAyinBasi = new Date(bugun.getFullYear(), bugun.getMonth(), 1).toISOString().split('T')[0];
    const buAyinSonu = new Date(bugun.getFullYear(), bugun.getMonth(), 28).toISOString().split('T')[0];
    // 3. Borçlandırmalar (gider_uyeler tablonuza göre)
    let borcQuery = supabase
      .from("gider_uyeler")
      .select("*, giderler(baslik)")
      .eq("uye_id", id)
      .order("borc_tarih", { ascending: true });

    if (f_bas) borcQuery = borcQuery.gte("borc_tarih", f_bas);
    if (f_bit) borcQuery = borcQuery.lte("borc_tarih", f_bit);
    else borcQuery = borcQuery.lte("borc_tarih", buAyinSonu); // Sadece bu ayın 1'ine kadar olanlar

    const { data: borcData } = await borcQuery;

    // 4. Ödemeler (odemeler tablonuza göre)
    const { data: odemeData } = await supabase
      .from("odemeler")
      .select("*")
      .eq("uye_id", id)
      .order("odeme_tarihi", { ascending: true });

    setBorclar(borcData || []);
    setOdemeler(odemeData || []);
    setLoading(false);
  };

  const handleFiltreUygula = () => fetchVeriler(basTarih, bitTarih);

  const handleTahsilatKaydet = async () => {
    if (!odemeTutar || parseFloat(odemeTutar) <= 0) return alert("Tutar giriniz.");
    
    // odemeler tablonuza kayıt atıyoruz
    const { error } = await supabase.from("odemeler").insert([{
      uye_id: id,
      tutar: parseFloat(odemeTutar),
      odeme_tarihi: new Date().toISOString().split('T')[0],
      odeme_tipi: 'kismi' // Şemanızdaki check constraint'e uygun
    }]);

    if (!error) {
      setIsModalOpen(false);
      setOdemeTutar("");
      fetchVeriler();
    } else {
      alert("Hata: " + error.message);
    }
  };

  const toplamBorc = borclar.reduce((acc, curr) => acc + Number(curr.borc_tutari || 0), 0);
  const odenenToplam = odemeler.reduce((acc, curr) => acc + Number(curr.tutar || 0), 0);
  const guncelBakiye = odenenToplam-toplamBorc;

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-teal-600">VERİLER YÜKLENİYOR...</div>;

  return (
    <div className="p-6 bg-[#f0f2f5] min-h-screen font-sans">
      <div className="max-w-[1200px] mx-auto">
        
        {/* ÜST ARAÇ ÇUBUĞU */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 font-bold text-xs uppercase">
            <ChevronLeft size={18} /> GERİ DÖN
          </button>
          <div className="flex gap-3">
            <button onClick={() => setIsModalOpen(true)} className="bg-[#1eb3a4] text-white px-6 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg shadow-teal-100 uppercase">
              <Wallet size={18} /> TAHSİLAT YAP
            </button>
            <button onClick={() => window.print()} className="bg-white border border-gray-200 text-gray-600 px-6 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-gray-50 uppercase">
              <Printer size={18} /> YAZDIR
            </button>
          </div>
        </div>

        {/* ÜYE KARTI */}
        <div className="bg-white rounded-[25px] p-5 mb-6 flex items-center justify-between shadow-sm border border-gray-100">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-[#1eb3a4] rounded-2xl flex items-center justify-center text-white text-2xl font-black italic">
              {uye?.ad?.charAt(0)}
            </div>
            <h1 className="text-xl font-black text-gray-800 uppercase tracking-tighter">{uye?.ad}</h1>
          </div>
          
          <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100 print:hidden">
             <input type="date" value={basTarih} onChange={(e)=>setBasTarih(e.target.value)} className="bg-transparent text-[10px] font-bold outline-none" />
             <span className="text-gray-300">-</span>
             <input type="date" value={bitTarih} onChange={(e)=>setBitTarih(e.target.value)} className="bg-transparent text-[10px] font-bold outline-none" />
             <button onClick={handleFiltreUygula} className="bg-[#1eb3a4] text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase">UYGULA</button>
          </div>
        </div>

        {/* EKSTRE TABLOLARI */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* BORÇLAR */}
          <div className="bg-white rounded-[25px] shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-[#3a8b81] p-3 text-center font-black text-white text-xs uppercase tracking-widest">BORÇLANDIRMALAR</div>
            <table className="w-full text-[11px]">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-400 font-black">
                <tr>
                  <th className="p-4 text-left">TARİH</th>
                  <th className="p-4 text-left">AÇIKLAMA</th>
                  <th className="p-4 text-right">BORÇ</th>
                  <th className="p-4 text-center">İŞLEM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {borclar.map((b) => (
                  <tr key={b.id} className="font-bold text-gray-700">
                    <td className="p-4">{new Date(b.borc_tarih).toLocaleDateString('tr-TR')}</td>
                    <td className="p-4 uppercase">{b.giderler?.baslik}</td>
                    <td className="p-4 text-right">{Number(b.borc_tutari).toLocaleString('tr-TR', {minimumFractionDigits: 2})}₺</td>
                    <td className="p-4 text-center">
                      <div className={`w-4 h-4 rounded-full mx-auto border-2 ${b.durum === 'tam' ? 'bg-[#1eb3a4] border-[#1eb3a4]' : 'border-gray-200'}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-5 flex justify-between bg-gray-50/50 border-t">
               <span className="text-rose-600 font-black text-[10px] uppercase">TOPLAM TAHAKKUK</span>
               <span className="text-rose-600 font-black text-lg">{toplamBorc.toLocaleString('tr-TR', {minimumFractionDigits: 2})}₺</span>
            </div>
          </div>

          {/* ÖDEMELER */}
          <div className="bg-white rounded-[25px] shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <div className="bg-[#3a8b81] p-3 text-center font-black text-white text-xs uppercase tracking-widest">ÖDEME HAREKETLERİ</div>
            <div className="flex-1">
              <table className="w-full text-[11px]">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-400 font-black">
                  <tr>
                    <th className="p-4 text-left">TARİH</th>
                    <th className="p-4 text-left">AÇIKLAMA</th>
                    <th className="p-4 text-right">TUTAR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {odemeler.map((o) => (
                    <tr key={o.id} className="font-bold text-gray-700">
                      <td className="p-4">{new Date(o.odeme_tarihi).toLocaleDateString('tr-TR')}</td>
                      <td className="p-4 uppercase text-teal-600">Tahsilat Makbuzu</td>
                      <td className="p-4 text-right text-teal-600">{Number(o.tutar).toLocaleString('tr-TR', {minimumFractionDigits: 2})}₺</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-5 bg-gray-50 border-t space-y-1">
               <div className="flex justify-between text-[10px] font-black text-gray-400">
                  <span>ÖDENEN TOPLAM</span>
                  <span>{odenenToplam.toLocaleString('tr-TR', {minimumFractionDigits: 2})}₺</span>
               </div>
               <div className="flex justify-between items-center">
                  <span className="font-black text-gray-800 text-xs">GÜNCEL BAKİYE</span>
                  <span className="text-2xl font-black text-rose-600">{guncelBakiye.toLocaleString('tr-TR', {minimumFractionDigits: 2})}₺ (B)</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* TAHSİLAT POPUP */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] w-full max-w-sm p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-black text-gray-800 uppercase text-lg">Tahsilat Yap</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-rose-600"><X /></button>
            </div>
            <div className="space-y-5">
              <div className="bg-gray-50 p-4 rounded-2xl">
                <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">Ödeme Tutarı (₺)</label>
                <input type="number" value={odemeTutar} onChange={(e)=>setOdemeTutar(e.target.value)} className="bg-transparent w-full text-2xl font-black outline-none text-gray-800" placeholder="0.00" />
              </div>
              <button onClick={handleTahsilatKaydet} className="w-full bg-[#1eb3a4] text-white py-4 rounded-2xl font-black uppercase tracking-tighter shadow-lg shadow-teal-100">KAYDI TAMAMLA</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}