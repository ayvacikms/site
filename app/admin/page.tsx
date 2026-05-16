"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { 
  PlusCircle, 
  PieChart,
  Calendar,
  Wallet,
  X,
  Search,
  Loader2,
  Check
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { 
  AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart as RePie, Pie, Cell 
} from 'recharts';

// --- TYPESCRIPT INTERFACES ---
interface DashboardStats {
  toplamUye: number;
  toplamBorclandirma: number;
  toplamTahsilat: number;
  bekleyenGelir: number;
  gecikmisOdemeSayisi: number;
  gecikmisTutar: number;
  tamOdemeYapan: number;
  kismiOdemeYapan: number;
  fazlaOdemeYapan: number;
  fazlaOdemeTutar: number;
}

interface ChartDataPoint {
  name: string;
  miktar: number;
}

interface UyeItem {
  id: string;
  ad: string;
  telefon?: string | null;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    toplamUye: 0,
    toplamBorclandirma: 0,
    toplamTahsilat: 0,
    bekleyenGelir: 0,
    gecikmisOdemeSayisi: 0,
    gecikmisTutar: 0,
    tamOdemeYapan: 0,
    kismiOdemeYapan: 0,
    fazlaOdemeYapan: 0,
    fazlaOdemeTutar: 0
  });
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  // --- HIZLI TAHSİLAT MODAL STATE'LERİ ---
  const [isFastModalOpen, setIsFastModalOpen] = useState(false);
  const [allUyeler, setAllUyeler] = useState<UyeItem[]>([]);
  const [uyeSearch, setUyeSearch] = useState("");
  const [selectedFastUye, setSelectedFastUye] = useState<UyeItem | null>(null);
  const [fastTutar, setFastTutar] = useState("");
  const [fastOdemeYontemi, setFastOdemeYontemi] = useState<"Nakit" | "Banka">("Nakit");
  const [isFastSaving, setIsFastSaving] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    const bugun = new Date().toISOString().split('T')[0];
    
    try {
      const { count: uyeCount } = await supabase.from("uyeler").select("*", { count: 'exact', head: true });
      const { data: borclar } = await supabase.from("gider_uyeler").select("borc_tutari, borc_tarih, durum, bakiye, uye_id");
      const { data: odemeler } = await supabase.from("odemeler").select("uye_id, tutar, odeme_tarihi");

      const vadesiGelmisBorclar: Record<string, number> = {};
      const toplamBorclarMap: Record<string, number> = {};
      const uyeOdemeleriMap: Record<string, number> = {};

      borclar?.forEach(b => {
        toplamBorclarMap[b.uye_id] = (toplamBorclarMap[b.uye_id] || 0) + Number(b.borc_tutari);
        if (b.borc_tarih <= bugun) {
          vadesiGelmisBorclar[b.uye_id] = (vadesiGelmisBorclar[b.uye_id] || 0) + Number(b.borc_tutari);
        }
      });

      odemeler?.forEach(o => {
        uyeOdemeleriMap[o.uye_id] = (uyeOdemeleriMap[o.uye_id] || 0) + Number(o.tutar);
      });

      let tam = 0, kismi = 0, fazlaSayi = 0, fazlaToplamTutar = 0;
      const tumUyeIdleri = new Set([...Object.keys(toplamBorclarMap), ...Object.keys(uyeOdemeleriMap)]);

      tumUyeIdleri.forEach(uid => {
        const vadesiGelmis = vadesiGelmisBorclar[uid] || 0;
        const toplamOdeme = uyeOdemeleriMap[uid] || 0;

        if (vadesiGelmis > 0) {
          if (toplamOdeme >= vadesiGelmis) {
            tam++;
            if (toplamOdeme > vadesiGelmis) {
              fazlaSayi++;
              fazlaToplamTutar += (toplamOdeme - vadesiGelmis);
            }
          } else if (toplamOdeme > 0) {
            kismi++;
          }
        } else if (toplamOdeme > 0) {
          fazlaSayi++;
          fazlaToplamTutar += toplamOdeme;
          tam++;
        }
      });

      const aylikVeri: Record<string, number> = {};
      odemeler?.forEach(o => {
        const ay = new Date(o.odeme_tarihi).toLocaleString('tr-TR', { month: 'short' });
        aylikVeri[ay] = (aylikVeri[ay] || 0) + Number(o.tutar);
      });
      const formattedChart = Object.entries(aylikVeri).map(([name, miktar]) => ({ name, miktar }));

      setStats({
        toplamUye: uyeCount || 0,
        toplamBorclandirma: Object.values(toplamBorclarMap).reduce((a, b) => a + b, 0),
        toplamTahsilat: Object.values(uyeOdemeleriMap).reduce((a, b) => a + b, 0),
        bekleyenGelir: Math.max(0, Object.values(vadesiGelmisBorclar).reduce((a, b) => a + b, 0) - Object.values(uyeOdemeleriMap).reduce((a, b) => a + b, 0)),
        gecikmisOdemeSayisi: borclar?.filter(b => b.borc_tarih <= bugun && b.durum !== 'tam').length || 0,
        gecikmisTutar: borclar?.filter(b => b.borc_tarih <= bugun && b.durum !== 'tam').reduce((acc, curr) => acc + Number(curr.bakiye), 0) || 0,
        tamOdemeYapan: tam,
        kismiOdemeYapan: kismi,
        fazlaOdemeYapan: fazlaSayi,
        fazlaOdemeTutar: fazlaToplamTutar
      });
      setChartData(formattedChart);

    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchAllUyelerForFastAction = async () => {
    const { data, error } = await supabase
      .from("uyeler")
      .select("id, ad, telefon")
      .order("ad", { ascending: true });
    
    if (!error) setAllUyeler(data || []);
  };

  const filteredUyeler = useMemo(() => {
    if (!uyeSearch) return allUyeler.slice(0, 5);
    return allUyeler.filter(u => 
      u.ad?.toLowerCase().includes(uyeSearch.toLowerCase())
    );
  }, [allUyeler, uyeSearch]);

  const handleFastTahsilatKaydet = async () => {
    if (!selectedFastUye) return toast.error("Lütfen bir üye seçiniz.");
    if (!fastTutar || parseFloat(fastTutar.replace(',', '.')) <= 0) {
      return toast.error("Lütfen geçerli bir tutar giriniz.");
    }

    setIsFastSaving(true);
    try {
      const temizTutar = parseFloat(fastTutar.replace(',', '.'));
      const bugun = new Date().toISOString().split('T')[0];
      
      // Kasa tablonuzda artı (+) bakiye basması için "Gelir" veya "Giriş" kontrolü
      const islemTipi = "Gelir"; 

      // 1. Ödemeler Tablosuna Ekle
      const { error: odemeError } = await supabase.from("odemeler").insert([{
        uye_id: selectedFastUye.id,
        tutar: temizTutar,
        odeme_tipi: fastOdemeYontemi === "Nakit" ? 'nakit' : 'banka',
        odeme_tarihi: bugun,
        odeme_yontemi: fastOdemeYontemi === "Nakit" ? "Elden" : "Havale/EFT",
        not: `Dashboard Hızlı İşlem Panelinden Alınan Tahsilat (${fastOdemeYontemi})`
      }]);

      if (odemeError) throw new Error(`Ödeme kaydı başarısız: ${odemeError.message}`);

      // 2. Kasa Hareketleri Tablosuna Ekle
      const { error: kasaError } = await supabase.from("kasa_hareketler").insert([
        {
          islem_tarihi: bugun,
          islem_tipi: islemTipi, 
          odeme_yontemi: fastOdemeYontemi === "Nakit" ? "Nakit" : "Banka", 
          tutar: temizTutar,
          aciklama: `${selectedFastUye.ad} - Dashboard Hızlı Tahsilat Ödemesi`,
          ilgili_id: null,
        },
      ]);

      if (kasaError) {
        console.error("Supabase Kasa Hatası Detayı:", kasaError);
        throw new Error(kasaError.message || "Veritabanı kısıtlamasına takıldı.");
      }

      toast.success(`${selectedFastUye.ad} için tahsilat (${fastOdemeYontemi}) kasaya ve üye carisine işlendi.`);
      
      setIsFastModalOpen(false);
      setSelectedFastUye(null);
      setFastTutar("");
      setUyeSearch("");
      setFastOdemeYontemi("Nakit");
      
      fetchDashboardData();

    } catch (error: unknown) {
      const errorMetni = error instanceof Error ? error.message : "Hata oluştu";
      toast.error("İşlem başarısız: " + errorMetni);
    } finally { // <--- Yazım hatası 'finally' olarak düzeltildi!
      setIsFastSaving(false);
    }
  };

  const pieData = [
    { name: 'Tam', value: stats.tamOdemeYapan, color: '#4FBCA1' },
    { name: 'Kısmi', value: stats.kismiOdemeYapan, color: '#F59E0B' },
    { name: 'Borçlu', value: stats.toplamUye - stats.tamOdemeYapan - stats.kismiOdemeYapan, color: '#EF4444' },
  ];

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400">VERİLER ANALİZ EDİLİYOR...</div>;

  return (
    <div className="space-y-8 pb-10">
      {/* BAŞLIK */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Yönetim Paneli</h1>
          <p className="text-slate-500 text-sm font-medium">Ayvacık MS Finansal Durum Raporu</p>
        </div>
        <div className="flex w-full md:w-auto gap-3">
          <button 
            onClick={() => { setIsFastModalOpen(true); fetchAllUyelerForFastAction(); }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-slate-800 transition-all shadow-lg"
          >
            <Wallet size={16} /> Hızlı Tahsilat
          </button>
          
          <Link href="/admin/raporlar" className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-100 text-slate-700 px-5 py-3 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all">
              Raporlar
          </Link>
          <Link href="/admin/borclar" className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#4FBCA1] text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-[#4FBCA1]/20 hover:scale-105 transition-all">
            <PlusCircle size={18} /> Borçlandırmalar
          </Link>
        </div>
      </div>

      {/* İSTATİSTİK KARTLARI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Toplam Tahsilat</p>
          <h3 className="text-3xl font-black text-teal-600">{stats.toplamTahsilat.toLocaleString('tr-TR')} ₺</h3>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-teal-600 uppercase">
             <Wallet size={14} /> Kasadaki Net Nakit
          </div>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Bekleyen Gelir</p>
          <h3 className="text-3xl font-black text-slate-800">{stats.bekleyenGelir.toLocaleString('tr-TR')} ₺</h3>
          <p className="mt-4 text-[10px] font-black text-slate-400 uppercase italic">Vadesi Gelmiş Alacak</p>
        </div>

        <div className="bg-rose-50 p-6 rounded-[32px] border border-rose-100 shadow-sm">
          <p className="text-[11px] font-black text-rose-500 uppercase tracking-widest mb-1">Gecikmiş Ödemeler</p>
          <h3 className="text-2xl font-black text-rose-700">{stats.gecikmisTutar.toLocaleString('tr-TR')} ₺</h3>
          <p className="mt-4 text-[10px] font-black text-rose-600 uppercase flex items-center gap-1">
            {stats.gecikmisOdemeSayisi} Kayıt Beklemede
          </p>
        </div>

        <div className="bg-blue-50 p-6 rounded-[32px] border border-blue-100 shadow-sm">
          <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-1">Fazla Ödemeler</p>
          <h3 className="text-2xl font-black text-blue-700">{stats.fazlaOdemeTutar.toLocaleString('tr-TR')} ₺</h3>
          <p className="mt-4 text-[10px] font-black text-blue-600 uppercase">{stats.fazlaOdemeYapan} Üye Havuzda</p>
        </div>
      </div>

      {/* GRAFİKLER BÖLÜMÜ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-black text-slate-800 uppercase text-sm tracking-tighter flex items-center gap-2">
              <Calendar size={18} className="text-[#4FBCA1]" /> Tahsilat Trendi
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-50 px-3 py-1 rounded-full">Son 6 Ay</span>
          </div>
          <div className="h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorMiktar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4FBCA1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4FBCA1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700, fill: '#94a3b8'}} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold'}}
                />
                <Area type="monotone" dataKey="miktar" stroke="#4FBCA1" strokeWidth={4} fillOpacity={1} fill="url(#colorMiktar)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm">
          <h3 className="font-black text-slate-800 uppercase text-sm mb-8 tracking-tighter flex items-center gap-2">
            <PieChart size={18} className="text-blue-500" /> Ödeme Dağılımı
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RePie>
                <Pie
                  data={pieData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RePie>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-3">
            {pieData.map((item) => (
              <div key={item.name} className="flex justify-between items-center text-xs font-bold uppercase">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{backgroundColor: item.color}}></div>
                  <span className="text-slate-400">{item.name}</span>
                </span>
                <span className="text-slate-800">{item.value} Üye</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ALT ANALİZ ÇUBUĞU */}
      <div className="bg-slate-900 rounded-[40px] p-8 text-white">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex-1">
            <h2 className="text-lg font-black mb-1 uppercase tracking-tight">Finansal Sağlık Oranı</h2>
            <div className="flex items-end gap-2 mb-4">
               <span className="text-5xl font-black text-[#4FBCA1]">%{((stats.toplamTahsilat / stats.toplamBorclandirma) * 100 || 0).toFixed(1)}</span>
               <span className="text-slate-400 text-xs font-bold mb-2 uppercase">/ Hedef %100</span>
            </div>
            <div className="w-full bg-slate-800 h-4 rounded-full overflow-hidden">
              <div 
                className="bg-[#4FBCA1] h-full shadow-[0_0_20px_rgba(79,188,161,0.5)] transition-all duration-1000" 
                style={{ width: `${Math.min(100, (stats.toplamTahsilat / stats.toplamBorclandirma) * 100 || 0)}%` }}
              ></div>
            </div>
          </div>
          <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Sistem Notu</p>
            <p className="text-xs font-medium italic text-slate-300">
              "Vade bazlı hesaplama aktif. Henüz vadesi gelmemiş <br/> alacaklar bekleyen gelire dahil edilmemiştir."
            </p>
          </div>
        </div>
      </div>

      {/* ⚡ HIZLI TAHSİLAT POPUP MODAL ⚡ */}
      {isFastModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600">
                  <Wallet size={20} />
                </div>
                <div>
                  <h2 className="font-black text-slate-800 uppercase text-lg tracking-tight">Hızlı İşlem Paneli</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sayfa değiştirmeden anlık tahsilat</p>
                </div>
              </div>
              <button 
                onClick={() => { setIsFastModalOpen(false); setSelectedFastUye(null); setFastTutar(""); setUyeSearch(""); setFastOdemeYontemi("Nakit"); }} 
                className="text-slate-300 hover:text-rose-500 transition-colors"
              >
                <X size={24}/>
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto pr-1 flex-1">
              {!selectedFastUye ? (
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">1. Üye Seçimi Yapın</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Üye adı veya soyadı yazın..."
                      value={uyeSearch}
                      onChange={(e) => setUyeSearch(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-teal-500 focus:bg-white transition-all"
                      autoFocus
                    />
                  </div>

                  <div className="border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-50 max-h-48 overflow-y-auto shadow-inner bg-slate-50/50">
                    {filteredUyeler.length === 0 ? (
                      <p className="p-4 text-center text-xs font-bold text-slate-400">Üye bulunamadı.</p>
                    ) : (
                      filteredUyeler.map((u) => (
                        <div 
                          key={u.id}
                          onClick={() => { setSelectedFastUye(u); setUyeSearch(""); }}
                          className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-teal-50/60 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 bg-slate-200 group-hover:bg-teal-100 group-hover:text-teal-600 transition-colors rounded-lg flex items-center justify-center text-slate-500 text-xs font-black">
                              {u.ad?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-700 uppercase group-hover:text-teal-900">{u.ad}</p>
                              <p className="text-[10px] font-medium text-slate-400">{u.telefon || "Telefon kayıtlı değil"}</p>
                            </div>
                          </div>
                          <span className="text-[9px] font-black uppercase text-slate-400 group-hover:text-teal-600 bg-white px-2 py-1 rounded-md border border-slate-100 shadow-sm">Seç</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-teal-50/60 border border-teal-100 p-4 rounded-2xl flex items-center justify-between animate-in zoom-in-95 duration-150">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center text-white text-sm font-black">
                      {selectedFastUye.ad?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-teal-600 uppercase tracking-wider leading-none mb-0.5">Seçili Üye</p>
                      <h4 className="text-sm font-black text-slate-800 uppercase">{selectedFastUye.ad}</h4>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setSelectedFastUye(null); setFastTutar(""); }}
                    className="text-xs font-black text-rose-500 hover:text-rose-700 uppercase bg-white border border-rose-100 px-3 py-1.5 rounded-xl shadow-sm transition-colors"
                  >
                    Değiştir
                  </button>
                </div>
              )}

              {selectedFastUye && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-200">
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">2. Ödeme Yöntemi</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFastOdemeYontemi("Nakit")}
                        className={`p-3 rounded-xl border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                          fastOdemeYontemi === "Nakit"
                            ? "bg-slate-900 text-white border-slate-900 shadow-md"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {fastOdemeYontemi === "Nakit" && <Check size={14} />} Nakit (Elden)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFastOdemeYontemi("Banka")}
                        className={`p-3 rounded-xl border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                          fastOdemeYontemi === "Banka"
                            ? "bg-slate-900 text-white border-slate-900 shadow-md"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {fastOdemeYontemi === "Banka" && <Check size={14} />} Banka (EFT/Havale)
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-5 rounded-2xl border-2 border-slate-100 focus-within:border-teal-500 transition-all shadow-inner">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block tracking-widest">3. Tahsil Edilen Tutar (₺)</label>
                    <input 
                      type="number" 
                      value={fastTutar} 
                      onChange={(e)=>setFastTutar(e.target.value)} 
                      className="bg-transparent w-full text-3xl font-black outline-none text-slate-800 tracking-tighter" 
                      placeholder="0.00" 
                      autoFocus
                    />
                  </div>

                  <button 
                    onClick={handleFastTahsilatKaydet} 
                    disabled={isFastSaving}
                    className="w-full bg-slate-950 text-white py-4.5 rounded-2xl font-black uppercase tracking-[0.15em] shadow-xl hover:bg-slate-800 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs"
                  >
                    {isFastSaving ? <Loader2 className="animate-spin" size={16} /> : "İŞLEMİ TAMAMLA"}
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}