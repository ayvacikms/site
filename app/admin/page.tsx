"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  TrendingUp, 
  Users, 
  AlertCircle, 
  PlusCircle, 
  PieChart,
  Filter,
  ArrowRight,
  Calendar,
  DollarSign
} from "lucide-react";
import Link from "next/link";
// Grafikler için gerekli bileşenler
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, Cell, PieChart as RePie, Pie 
} from 'recharts';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
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
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    const bugun = new Date().toISOString().split('T')[0];
    
    try {
      // 1. Verileri Çek
      const { count: uyeCount } = await supabase.from("uyeler").select("*", { count: 'exact', head: true });
      const { data: borclar } = await supabase.from("gider_uyeler").select("borc_tutari, borc_tarih, durum, bakiye, uye_id");
      const { data: odemeler } = await supabase.from("odemeler").select("uye_id, tutar, odeme_tarihi");

      // 2. Vade Bazlı Hesaplama Motoru
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

      // Statüleri Belirle
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

      // 3. Grafik Verisi Hazırlama (Aylık Tahsilat Trendi)
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
          <Link href="/admin/raporlar" className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-100 text-slate-700 px-5 py-3 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all">
             Raporlar
          </Link>
          <Link href="/admin/borclar" className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#4FBCA1] text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-[#4FBCA1]/20 hover:scale-105 transition-all">
            <PlusCircle size={18} /> Borçlandırmalar
          </Link>
        </div>
      </div>

      {/* İSTATİSTİK KARTLARI (Orijinal Tasarımın) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Toplam Tahsilat</p>
          <h3 className="text-3xl font-black text-teal-600">{stats.toplamTahsilat.toLocaleString('tr-TR')} ₺</h3>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-teal-600 uppercase">
             <TrendingUp size={14} /> Kasadaki Net Nakit
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
            {stats.gecikmisOdemeSayisi} Kayıt Beklemede <ArrowRight size={12} />
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
        
        {/* Tahsilat Trendi (Area Chart) */}
        <div className="lg:col-span-2 bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-black text-slate-800 uppercase text-sm tracking-tighter flex items-center gap-2">
              <Calendar size={18} className="text-[#4FBCA1]" /> Tahsilat Trendi
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-50 px-3 py-1 rounded-full">Son 6 Ay</span>
          </div>
          <div className="h-[300px] w-full">
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

        {/* Üye Dağılımı (Pie Chart) */}
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
    </div>
  );
}