"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { 
  ChevronLeft, Printer, Wallet, CheckCircle2, X, 
  Trash2, AlertCircle, Info, Loader2 
} from "lucide-react";
import toast from "react-hot-toast";

export default function UyeEkstresiPage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [uye, setUye] = useState<any>(null);
  const [borclar, setBorclar] = useState<any[]>([]);
  const [odemeler, setOdemeler] = useState<any[]>([]);
  
  const [basTarih, setBasTarih] = useState("");
  const [bitTarih, setBitTarih] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [odemeTutar, setOdemeTutar] = useState("");
  const [odemeTipi, setOdemeTipi] = useState("nakit"); // YENİ: Ödeme tipi seçimi için state
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) fetchVeriler();
  }, [id]);

  const fetchVeriler = async (f_bas?: string, f_bit?: string) => {
    setLoading(true);
    try {
      const { data: uyeData } = await supabase.from("uyeler").select("*").eq("id", id).single();
      setUye(uyeData);

      const bugun = new Date();
      const buAyinSonu = new Date(bugun.getFullYear(), bugun.getMonth() + 1, 0).toISOString().split('T')[0];

      let borcQuery = supabase
        .from("gider_uyeler")
        .select("*, giderler(baslik)")
        .eq("uye_id", id)
        .order("borc_tarih", { ascending: true });

      if (f_bas) borcQuery = borcQuery.gte("borc_tarih", f_bas);
      if (f_bit) borcQuery = borcQuery.lte("borc_tarih", f_bit);
      else borcQuery = borcQuery.lte("borc_tarih", buAyinSonu);

      const { data: borcData } = await borcQuery;

      const { data: odemeData } = await supabase
        .from("odemeler")
        .select("*")
        .eq("uye_id", id)
        .order("odeme_tarihi", { ascending: true });

      setBorclar(borcData || []);
      setOdemeler(odemeData || []);
    } catch (error) {
      toast.error("Veriler alınırken hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const hesaplanmisVeriler = useMemo(() => {
    let toplamOdemeHavuzu = odemeler.reduce((acc, curr) => acc + Number(curr.tutar), 0);
    const toplamBorcYukumlulugu = borclar.reduce((acc, curr) => acc + Number(curr.borc_tutari), 0);
    
    const islenmisBorclar = borclar.map((borc) => {
      const tutar = Number(borc.borc_tutari);
      let kalan = 0, durum = "";

      if (toplamOdemeHavuzu >= tutar) {
        kalan = 0; 
        toplamOdemeHavuzu -= tutar; 
        durum = "ÖDENDİ";
      } else if (toplamOdemeHavuzu > 0) {
        kalan = tutar - toplamOdemeHavuzu; 
        toplamOdemeHavuzu = 0; 
        durum = "KISMİ";
      } else {
        kalan = tutar; 
        durum = "BEKLİYOR";
      }
      return { ...borc, dKalan: kalan, dDurum: durum };
    });

    return {
      borcListesi: islenmisBorclar,
      toplamBorc: toplamBorcYukumlulugu,
      toplamOdeme: odemeler.reduce((acc, curr) => acc + Number(curr.tutar), 0),
      netBakiye: odemeler.reduce((acc, curr) => acc + Number(curr.tutar), 0) - toplamBorcYukumlulugu
    };
  }, [borclar, odemeler]);

  const handleBorcSil = async (borcId: string) => {
    if (!confirm("Bu borçlandırma kaydını silmek istediğinize emin misiniz?")) return;
    const { error } = await supabase.from("gider_uyeler").delete().eq("id", borcId);
    if (error) toast.error("Hata oluştu");
    else {
      toast.success("Borç kaydı silindi");
      fetchVeriler();
    }
  };

  // --- GÜVENLİ ÇİFT TARAFLI ÖDEME SİLME MOTORU ---
  const handleOdemeSil = async (odemeId: string) => {
    if (!confirm("Bu ödeme kaydını silmek istediğinize emin misiniz? Bu işlem kasadaki ilgili nakit hareketini de silecektir!")) return;
    
    try {
      // 1. Önce silinecek ödemenin detayını (tutarını vb.) kontrol etmek için buluyoruz
      const { data: silinecekOdeme, error: fetchError } = await supabase
        .from("odemeler")
        .select("*")
        .eq("id", odemeId)
        .single();

      if (fetchError || !silinecekOdeme) throw new Error("Ödeme kaydı bulunamadı.");

      // 2. Kasa hareketleri tablosundan bu üyeye ait, aynı tarihteki ve aynı tutardaki gelir kaydını temizliyoruz
      const { error: kasaSilError } = await supabase
        .from("kasa_hareketler")
        .delete()
        .eq("ilgili_id", id)
        .eq("islem_tipi", "gelir")
        .eq("tutar", silinecekOdeme.tutar);

      if (kasaSilError) console.warn("Kasa hareketi silinirken veya eşleşirken bir uyarı oluştu:", kasaSilError.message);

      // 3. Ana ödeme kaydını siliyoruz
      const { error: odemeSilError } = await supabase.from("odemeler").delete().eq("id", odemeId);
      if (odemeSilError) throw odemeSilError;

      toast.success("Ödeme kaydı ve ilişkili kasa hareketi başarıyla silindi.");
      fetchVeriler();
    } catch (error: any) {
      toast.error("Silme işlemi sırasında hata: " + (error.message || "Hata oluştu"));
    }
  };

  // --- ÇİFT TARAFLI TAHSİLAT KAYIT MOTORU ---
  const handleTahsilatKaydet = async () => {
    if (!odemeTutar || parseFloat(odemeTutar.replace(',', '.')) <= 0) {
      return toast.error("Lütfen geçerli bir tutar giriniz.");
    }

    setIsSaving(true);

    try {
      const temizTutar = parseFloat(odemeTutar.replace(',', '.'));
      const bugun = new Date().toISOString().split('T')[0];
      const yontemMetni = odemeTipi === 'nakit' ? 'Elden' : 'Banka/Havale';

      // 1. ADIM: Odemeler tablosuna üye ödemesini ekle
      const { error: odemeError } = await supabase.from("odemeler").insert([{
        uye_id: id,
        tutar: temizTutar,
        odeme_tipi: odemeTipi, 
        odeme_tarihi: bugun,
        odeme_yontemi: yontemMetni,
        not: "Üye Ekstre Sayfasından Alınan Tahsilat"
      }]);

      if (odemeError) throw odemeError;

      // 2. ADIM: Kasa Hareketler tablosuna Gelir olarak yansıt (Mimaride esnettiğimiz alan)
      const { error: kasaError } = await supabase.from("kasa_hareketler").insert([{
        islem_tarihi: new Date().toISOString(),
        islem_tipi: 'gelir',
        odeme_yontemi: yontemMetni,
        tutar: temizTutar,
        aciklama: `${uye?.ad || 'Üye'} - Ekstre Sayfası Tahsilat Ödemesi`,
        ilgili_id: id // Üye ID serbest bırakılarak kasaya bağlandı
      }]);

      if (kasaError) throw kasaError;

      // 3. BAŞARI DURUMU: Kapat ve Temizle
      setIsModalOpen(false); 
      setOdemeTutar(""); 
      setOdemeTipi("nakit");   
      
      toast.success("Tahsilat başarıyla kasaya ve üye carisine işlendi.");
      fetchVeriler();

    } catch (error: any) {
      console.error("Tahsilat hatası:", error);
      toast.error("İşlem başarısız: " + (error.message || "Bilinmeyen hata"));
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <Loader2 className="animate-spin text-teal-600" size={48} />
      <span className="font-black text-teal-600 uppercase tracking-widest">Veriler Senkronize Ediliyor...</span>
    </div>
  );

  return (
    <div className="p-6 bg-[#f0f2f5] min-h-screen font-sans pb-20">
      <div className="max-w-[1200px] mx-auto">
        
        {/* ÜST ARAÇ ÇUBUĞU */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 font-black text-[10px] uppercase hover:text-gray-800 transition-colors">
            <ChevronLeft size={18} /> GERİ DÖN
          </button>
          <div className="flex gap-3">
            <button onClick={() => setIsModalOpen(true)} className="bg-[#1eb3a4] text-white px-8 py-3 rounded-2xl font-black text-xs flex items-center gap-2 shadow-xl shadow-teal-100 uppercase hover:scale-105 transition-all">
              <Wallet size={18} /> TAHSİLAT YAP
            </button>
            <button onClick={() => window.print()} className="bg-white border border-gray-200 text-gray-600 px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 hover:bg-gray-50 uppercase shadow-sm">
              <Printer size={18} /> PDF YAZDIR
            </button>
          </div>
        </div>

        {/* ÜYE KARTI */}
        <div className="bg-white rounded-[30px] p-6 mb-8 flex items-center justify-between shadow-sm border border-gray-100">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-[#1eb3a4] rounded-[20px] flex items-center justify-center text-white text-3xl font-black italic shadow-inner">
              {uye?.ad?.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tighter leading-none mb-1">{uye?.ad}</h1>
              <span className="text-[11px] font-bold text-teal-600 bg-teal-50 px-3 py-1 rounded-full uppercase tracking-tighter">{uye?.telefon || 'Telefon Yok'}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100 print:hidden shadow-inner">
             <input type="date" value={basTarih} onChange={(e)=>setBasTarih(e.target.value)} className="bg-transparent text-[11px] font-black outline-none text-gray-600" />
             <span className="text-gray-300 font-bold">/</span>
             <input type="date" value={bitTarih} onChange={(e)=>setBitTarih(e.target.value)} className="bg-transparent text-[11px] font-black outline-none text-gray-600" />
             <button onClick={() => fetchVeriler(basTarih, bitTarih)} className="bg-gray-800 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-black transition-colors">FİLTRELE</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* BORÇLANDIRMALAR */}
          <div className="bg-white rounded-[35px] shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <div className="bg-[#2C3E50] p-4 text-center font-black text-white text-[10px] uppercase tracking-[0.3em]">BORÇLANDIRMA EKSTRESİ</div>
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-400 font-black">
                  <tr>
                    <th className="p-5 text-left">VADE</th>
                    <th className="p-5 text-left">AÇIKLAMA</th>
                    <th className="p-5 text-right">BORÇ</th>
                    <th className="p-5 text-right">DURUM</th>
                    <th className="p-5 text-center">SİL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {hesaplanmisVeriler.borcListesi.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50/50 transition-colors font-bold text-gray-700 group">
                      <td className="p-5 text-gray-400">{new Date(b.borc_tarih).toLocaleDateString('tr-TR')}</td>
                      <td className="p-5 uppercase text-[10px] tracking-tight">{b.giderler?.baslik || b.aciklama}</td>
                      <td className="p-5 text-right font-black">{Number(b.borc_tutari).toLocaleString('tr-TR')}₺</td>
                      <td className="p-5 text-right">
                        {b.dDurum === "ÖDENDİ" ? (
                          <div className="flex items-center justify-end gap-1 text-teal-600">
                            <CheckCircle2 size={16} />
                            <span className="text-[10px] font-black italic tracking-tighter">ÖDENDİ</span>
                          </div>
                        ) : (
                          <span className="text-rose-500 font-black bg-rose-50 px-3 py-1 rounded-lg">
                            {b.dKalan.toLocaleString('tr-TR', {minimumFractionDigits: 2})}₺
                          </span>
                        )}
                      </td>
                      <td className="p-5 text-center">
                        <button onClick={() => handleBorcSil(b.id)} className="w-8 h-8 rounded-full bg-gray-50 text-gray-300 hover:text-rose-600 hover:bg-rose-100 transition-all flex items-center justify-center mx-auto">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-6 flex justify-between items-center bg-rose-50/30 border-t border-rose-100">
                <span className="text-rose-600 font-black text-[11px] uppercase tracking-[0.2em]">TOPLAM TAHAKKUK</span>
                <span className="text-rose-600 font-black text-2xl tracking-tighter">{hesaplanmisVeriler.toplamBorc.toLocaleString('tr-TR', {minimumFractionDigits: 2})}₺</span>
            </div>
          </div>

          {/* ÖDEMELER */}
          <div className="bg-white rounded-[35px] shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <div className="bg-[#1eb3a4] p-4 text-center font-black text-white text-[10px] uppercase tracking-[0.3em]">TAHSİLAT HAREKETLERİ</div>
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-400 font-black">
                  <tr>
                    <th className="p-5 text-left">TARİH</th>
                    <th className="p-5 text-left">KUTU / TÜR</th>
                    <th className="p-5 text-right">TUTAR</th>
                    <th className="p-5 text-center">İŞLEM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 font-bold text-gray-700">
                  {odemeler.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="p-5 text-gray-400">{new Date(o.odeme_tarihi).toLocaleDateString('tr-TR')}</td>
                      <td className="p-5 uppercase text-teal-600 text-[10px] font-black italic">
                        {o.odeme_tipi === 'nakit' ? '💵 Elden Nakit' : '🏦 Banka/Havale'}
                      </td>
                      <td className="p-5 text-right text-teal-600 font-black text-sm">+{Number(o.tutar).toLocaleString('tr-TR')}₺</td>
                      <td className="p-5 text-center">
                        <button onClick={() => handleOdemeSil(o.id)} className="w-8 h-8 rounded-full bg-rose-50 text-rose-300 hover:text-rose-600 hover:bg-rose-100 transition-all flex items-center justify-center mx-auto">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {odemeler.length === 0 && (
                <div className="p-16 text-center text-gray-300 font-black text-[11px] uppercase tracking-widest italic">Henüz bir ödeme kaydı bulunamadı.</div>
              )}
            </div>
            
            <div className="p-6 bg-gray-50/80 border-t border-gray-100 space-y-5">
               <div className="flex justify-between items-center text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">
                  <span>ÖDENEN TOPLAM</span>
                  <span className="text-xl text-gray-600">{hesaplanmisVeriler.toplamOdeme.toLocaleString('tr-TR', {minimumFractionDigits: 2})}₺</span>
               </div>
               
               <div className={`p-6 rounded-[25px] flex justify-between items-center shadow-sm border ${hesaplanmisVeriler.netBakiye >= 0 ? 'bg-teal-500 text-white border-teal-600' : 'bg-rose-600 text-white border-rose-700'}`}>
                  <div>
                    <span className="font-black text-[11px] uppercase block opacity-70 tracking-[0.2em] mb-1">GÜNCEL HESAP DURUMU</span>
                    <span className="text-3xl font-black leading-none tracking-tighter">
                      {Math.abs(hesaplanmisVeriler.netBakiye).toLocaleString('tr-TR', {minimumFractionDigits: 2})}₺
                      <span className="text-sm opacity-80 ml-2">{hesaplanmisVeriler.netBakiye >= 0 ? '(KREDİ)' : '(BORÇ)'}</span>
                    </span>
                  </div>
                  {hesaplanmisVeriler.netBakiye >= 0 ? <Info size={40} className="opacity-40" /> : <AlertCircle size={40} className="opacity-40" />}
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* TAHSİLAT POPUP / KASA VE TÜR ENTEGRASYONLU */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] w-full max-w-sm p-10 shadow-2xl border border-white/20">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-600">
                  <Wallet size={20} />
                </div>
                <h2 className="font-black text-gray-800 uppercase text-lg tracking-tighter leading-none">Tahsilat Gir</h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-300 hover:text-rose-600 transition-colors"><X size={28}/></button>
            </div>
            
            <div className="space-y-5">
              {/* Ödeme Tipi Seçimi (Nakit / Banka) */}
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Ödeme Kanalı</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    type="button"
                    onClick={() => setOdemeTipi("nakit")}
                    className={`p-3 rounded-xl font-black text-xs uppercase border-2 transition-all ${odemeTipi === 'nakit' ? 'bg-teal-50 border-teal-500 text-teal-700' : 'bg-white border-gray-100 text-gray-400'}`}
                  >
                    💵 Nakit Kasa
                  </button>
                  <button 
                    type="button"
                    onClick={() => setOdemeTipi("banka")}
                    className={`p-3 rounded-xl font-black text-xs uppercase border-2 transition-all ${odemeTipi === 'banka' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-100 text-gray-400'}`}
                  >
                    🏦 Banka Hesabı
                  </button>
                </div>
              </div>

              {/* Tutar Girişi */}
              <div className="bg-gray-50 p-6 rounded-[25px] border-2 border-gray-100 focus-within:border-[#1eb3a4] transition-all shadow-inner">
                <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Tahsil Edilen Tutar (₺)</label>
                <input 
                  type="number" 
                  value={odemeTutar} 
                  onChange={(e)=>setOdemeTutar(e.target.value)} 
                  className="bg-transparent w-full text-4xl font-black outline-none text-gray-800 tracking-tighter" 
                  placeholder="0.00" 
                  autoFocus
                />
              </div>

              <button 
                onClick={handleTahsilatKaydet} 
                disabled={isSaving}
                className="w-full bg-[#1eb3a4] text-white py-5 rounded-3xl font-black uppercase tracking-[0.2em] shadow-xl shadow-teal-100 hover:bg-teal-600 transition-all flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : "İŞLEMİ ONAYLA"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}