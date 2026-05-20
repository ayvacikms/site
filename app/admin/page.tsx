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
        //bekleyenGelir: Math.max(0, Object.values(vadesiGelmisBorclar).reduce((a, b) => a + b, 0) - Object.values(uyeOdemeleriMap).reduce((a, b) => a + b, 0)),
        bekleyenGelir: borclar?.filter(b => b.borc_tarih <= bugun && b.durum !== 'tam').reduce((acc, curr) => acc + Number(curr.bakiye), 0) || 0,
        gecikmisOdemeSayisi: borclar?.filter(b => b.borc_tarih <= bugun && b.durum !== 'tam').length || 0,
        gecikmisTutar: borclar?.filter(b => b.borc_tarih <= bugun && b.durum !== 'tam').reduce((acc, curr) => acc + Number(curr.bakiye), 0) || 0,
        tamOdemeYapan: tam,
        kismiOdemeYapan: kismi,
        fazlaOdemeYapan: fazlaSayi,
        fazlaOdemeTutar: fazlaToplamTutar
      });
      setChartData(formattedChart);

    } catch (e) { 
      console.error(e); 
      toast.error("Veriler çekilirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
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
      
      const { error: odemeError } = await supabase.from("odemeler").insert([{
        uye_id: selectedFastUye.id,
        tutar: temizTutar,
        odeme_tipi: fastOdemeYontemi === "Nakit" ? 'nakit' : 'banka',
        odeme_tarihi: bugun,
        odeme_yontemi: fastOdemeYontemi === "Nakit" ? "Elden" : "Havale/EFT",
        not: `Dashboard Hızlı İşlem Panelinden Alınan Tahsilat (${fastOdemeYontemi})`
      }]);

      if (odemeError) throw new Error(`Ödeme kaydı başarısız: ${odemeError.message}`);

      const { error: kasaError } = await supabase.from("kasa_hareketler").insert([
        {
          islem_tarihi: bugun,
          islem_tipi: "Gelir", 
          odeme_yontemi: fastOdemeYontemi === "Nakit" ? "Nakit" : "Banka", 
          tutar: temizTutar,
          aciklama: `${selectedFastUye.ad} - Dashboard Hızlı Tahsilat Ödemesi`,
          ilgili_id: null,
        },
      ]);

      if (kasaError) throw new Error(kasaError.message);

      toast.success(`${selectedFastUye.ad} için tahsilat başarıyla işlendi.`);
      
      setIsFastModalOpen(false);
      setSelectedFastUye(null);
      setFastTutar("");
      setUyeSearch("");
      
      fetchDashboardData();
    } catch (error: any) {
      toast.error("İşlem başarısız: " + error.message);
    } finally {
      setIsFastSaving(false);
    }
  };

  const pieData = [
    { name: 'Tam', value: stats.tamOdemeYapan, color: '#4FBCA1' },
    { name: 'Kısmi', value: stats.kismiOdemeYapan, color: '#F59E0B' },
    { name: 'Borçlu', value: Math.max(0, stats.toplamUye - stats.tamOdemeYapan - stats.kismiOdemeYapan), color: '#EF4444' },
  ];

  if (loading) {
    return (
      <div className="p-20 text-center flex flex-col items-center justify-center gap-4 min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-[#4FBCA1]" />
        <p className="font-black tracking-widest text-slate-400 text-xs uppercase">VERİLER ANALİZ EDİLİYOR...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 pb-12 min-w-0 w-full">
      {/* BAŞLIK VE AKSİYON BUTONLARI */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tight">Yönetim Paneli</h1>
          <p className="text-slate-500 text-xs md:text-sm font-medium">Ayvacık MS Finansal Durum Raporu</p>
        </div>
        <div className="grid grid-cols-2 sm:flex w-full xl:w-auto gap-2 md:gap-3">
          <button 
            onClick={() => { setIsFastModalOpen(true); fetchAllUyelerForFastAction(); }}
            className="col-span-2 sm:flex-none flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl md:rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-slate-800 transition-all shadow-lg"
          >
            <Wallet size={16} /> Hızlı Tahsilat
          </button>
          
          <Link href="/admin/raporlar" className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-3 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm hover:bg-slate-50 transition-all">
              Raporlar
          </Link>
          <Link href="/admin/borclar" className="flex items-center justify-center gap-2 bg-[#4FBCA1] text-white px-4 py-3 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm shadow-lg shadow-[#4FBCA1]/20 hover:bg-[#3da88d] transition-all">
            <PlusCircle size={16} /> Borçlandırma
          </Link>
        </div>
      </div>

      {/* İSTATİSTİK KARTLARI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-5 md:p-6 rounded-2xl md:rounded-[32px] border border-slate-200/60 shadow-sm relative overflow-hidden">
          <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Toplam Tahsilat</p>
          <h3 className="text-2xl md:text-3xl font-black text-teal-600">{stats.toplamTahsilat.toLocaleString('tr-TR')} ₺</h3>
          <div className="mt-3 md:mt-4 flex items-center gap-2 text-[9px] md:text-[10px] font-black text-teal-600 uppercase">
             <Wallet size={14} /> Kasadaki Net Nakit
          </div>
        </div>

        <div className="bg-white p-5 md:p-6 rounded-2xl md:rounded-[32px] border border-slate-200/60 shadow-sm">
          <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Bekleyen Gelir</p>
          <h3 className="text-2xl md:text-3xl font-black text-slate-800">{stats.bekleyenGelir.toLocaleString('tr-TR')} ₺</h3>
          <p className="mt-3 md:mt-4 text-[9px] md:text-[10px] font-black text-slate-400 uppercase italic">Vadesi Gelmiş Alacak</p>
        </div>

        <div className="bg-rose-50 p-5 md:p-6 rounded-2xl md:rounded-[32px] border border-rose-100 shadow-sm">
          <p className="text-[10px] md:text-[11px] font-black text-rose-500 uppercase tracking-widest mb-1">Gecikmiş Ödemeler</p>
          <h3 className="text-2xl font-black text-rose-700">{stats.gecikmisTutar.toLocaleString('tr-TR')} ₺</h3>
          <p className="mt-3 md:mt-4 text-[9px] md:text-[10px] font-black text-rose-600 uppercase flex items-center gap-1">
            {stats.gecikmisOdemeSayisi} Kayıt Beklemede
          </p>
        </div>

        <div className="bg-blue-50 p-5 md:p-6 rounded-2xl md:rounded-[32px] border border-blue-100 shadow-sm">
          <p className="text-[10px] md:text-[11px] font-black text-blue-600 uppercase tracking-widest mb-1">Fazla Ödemeler</p>
          <h3 className="text-2xl font-black text-blue-700">{stats.fazlaOdemeTutar.toLocaleString('tr-TR')} ₺</h3>
          <p className="mt-3 md:mt-4 text-[9px] md:text-[10px] font-black text-blue-600 uppercase">{stats.fazlaOdemeYapan} Üye Havuzda</p>
        </div>
      </div>

      {/* GRAFİKLER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl md:rounded-[40px] p-5 md:p-8 border border-slate-200/60 shadow-sm min-w-0">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-slate-800 uppercase text-xs md:text-sm tracking-tight flex items-center gap-2">
              <Calendar size={18} className="text-[#4FBCA1]" /> Tahsilat Trendi
            </h3>
            <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase bg-slate-50 px-3 py-1 rounded-full">Son 6 Ay</span>
          </div>
          <div className="h-[260px] md:h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorMiktar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4FBCA1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4FBCA1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 700, fill: '#94a3b8'}} />
                <YAxis hide />
                <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold'}} />
                <Area type="monotone" dataKey="miktar" stroke="#4FBCA1" strokeWidth={4} fillOpacity={1} fill="url(#colorMiktar)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl md:rounded-[40px] p-5 md:p-8 border border-slate-200/60 shadow-sm">
          <h3 className="font-black text-slate-800 uppercase text-xs md:text-sm mb-6 tracking-tight flex items-center gap-2">
            <PieChart size={18} className="text-blue-500" /> Ödeme Dağılımı
          </h3>
          <div className="h-[200px] md:h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RePie>
                <Pie data={pieData} innerRadius={55} outerRadius={75} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RePie>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2.5">
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

      {/* FINANSAL SAĞLIK ORANI */}
      <div className="bg-slate-900 rounded-2xl md:rounded-[40px] p-6 md:p-8 text-white">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-6">
          <div className="flex-1">
            <h2 className="text-base md:text-lg font-black mb-1 uppercase tracking-tight">Finansal Sağlık Oranı</h2>
            <div className="flex items-end gap-2 mb-4">
               <span className="text-4xl md:text-5xl font-black text-[#4FBCA1]">%{((stats.toplamTahsilat / stats.toplamBorclandirma) * 100 || 0).toFixed(1)}</span>
               <span className="text-slate-400 text-[10px] md:text-xs font-bold mb-1.5 uppercase">/ Hedef %100</span>
            </div>
            <div className="w-full bg-slate-800 h-3.5 rounded-full overflow-hidden">
              <div 
                className="bg-[#4FBCA1] h-full shadow-[0_0_20px_rgba(79,188,161,0.5)] transition-all duration-1000" 
                style={{ width: `${Math.min(100, (stats.toplamTahsilat / stats.toplamBorclandirma) * 100 || 0)}%` }}
              ></div>
            </div>
          </div>
          <div className="bg-slate-800 p-4 md:p-6 rounded-xl md:rounded-3xl border border-slate-700">
            <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase mb-1">Sistem Notu</p>
            <p className="text-[11px] font-medium italic text-slate-300 leading-normal">
              "Vade bazlı hesaplama aktif. Henüz vadesi gelmemiş alacaklar bekleyen gelire dahil edilmemiştir."
            </p>
          </div>
        </div>
      </div>

      {/* HIZLI TAHSİLAT MODAL POPUP */}
      {isFastModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[150] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl md:rounded-[2.5rem] w-full max-w-md p-6 md:p-8 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600">
                  <Wallet size={20} />
                </div>
                <div>
                  <h2 className="font-black text-slate-800 uppercase text-base md:text-lg tracking-tight">Hızlı İşlem Paneli</h2>
                  <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Anlık tahsilat girdisi</p>
                </div>
              </div>
              <button 
                onClick={() => { setIsFastModalOpen(false); setSelectedFastUye(null); setFastTutar(""); setUyeSearch(""); }} 
                className="text-slate-300 hover:text-rose-500 transition-colors"
              >
                <X size={24}/>
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
              {!selectedFastUye ? (
                <div className="space-y-2.5">
                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Üye Seçimi Yapın</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Üye adı yazın..."
                      value={uyeSearch}
                      onChange={(e) => setUyeSearch(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-teal-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-44 overflow-y-auto bg-slate-50/50">
                    {filteredUyeler.length === 0 ? (
                      <p className="p-4 text-center text-xs font-bold text-slate-400">Üye bulunamadı.</p>
                    ) : (
                      filteredUyeler.map((u) => (
                        <div 
                          key={u.id}
                          onClick={() => { setSelectedFastUye(u); setUyeSearch(""); }}
                          className="p-3 flex items-center justify-between cursor-pointer hover:bg-teal-50/60 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 bg-slate-200 rounded-lg flex items-center justify-center text-slate-600 text-xs font-black uppercase">
                              {u.ad?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-700 uppercase">{u.ad}</p>
                            </div>
                          </div>
                          <span className="text-[9px] font-black uppercase text-teal-600 bg-white px-2 py-1 rounded-md border border-slate-200">Seç</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-teal-50/60 border border-teal-100 p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white text-xs font-black uppercase">
                      {selectedFastUye.ad?.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase">{selectedFastUye.ad}</h4>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setSelectedFastUye(null); setFastTutar(""); }}
                    className="text-[10px] font-black text-rose-500 uppercase bg-white border border-rose-100 px-2.5 py-1.5 rounded-lg shadow-sm"
                  >
                    Değiştir
                  </button>
                </div>
              )}

              {selectedFastUye && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">2. Ödeme Yöntemi</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFastOdemeYontemi("Nakit")}
                        className={`p-2.5 rounded-xl border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                          fastOdemeYontemi === "Nakit" ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        {fastOdemeYontemi === "Nakit" && <Check size={12} />} Elden
                      </button>
                      <button
                        type="button"
                        onClick={() => setFastOdemeYontemi("Banka")}
                        className={`p-2.5 rounded-xl border text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                          fastOdemeYontemi === "Banka" ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        {fastOdemeYontemi === "Banka" && <Check size={12} />} EFT/Havale
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">3. Tutar (₺)</label>
                    <input 
                      type="number" 
                      value={fastTutar} 
                      onChange={(e)=>setFastTutar(e.target.value)} 
                      className="bg-transparent w-full text-2xl font-black outline-none text-slate-800" 
                      placeholder="0.00" 
                    />
                  </div>

                  <button 
                    onClick={handleFastTahsilatKaydet} 
                    disabled={isFastSaving}
                    className="w-full bg-slate-950 text-white py-3.5 rounded-xl font-black uppercase tracking-wider flex items-center justify-center gap-2 text-xs"
                  >
                    {isFastSaving ? <Loader2 className="animate-spin" size={14} /> : "İŞLEMİ TAMAMLA"}
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