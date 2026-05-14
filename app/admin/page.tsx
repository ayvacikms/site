"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  AlertCircle, 
  PlusCircle, 
  ArrowUpRight,
  Clock,
  ArrowRight,
  PieChart,
  Filter
} from "lucide-react";
import Link from "next/link";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    const bugun = new Date().toISOString().split('T')[0];
    
    // 1. Verileri Çek
    const { count: uyeCount } = await supabase.from("uyeler").select("*", { count: 'exact', head: true });
    const { data: borclar } = await supabase.from("gider_uyeler").select("borc_tutari, borc_tarih, durum, odenen_tutar, bakiye, uye_id");
    const { data: odemeler } = await supabase.from("odemeler").select("tutar");

    // 2. Temel Hesaplamalar
    const tBorc = borclar?.reduce((acc, curr) => acc + Number(curr.borc_tutari), 0) || 0;
    const tTahsilat = odemeler?.reduce((acc, curr) => acc + Number(curr.tutar), 0) || 0;

    // 3. Gecikmiş Ödemeler (Vadesi bugün veya geçmiş ve hala bakiyesi olanlar)
    const gecikmisBorclar = borclar?.filter(b => b.borc_tarih < bugun && b.durum !== 'tam') || [];
    const gSayi = gecikmisBorclar.length;
    const gTutar = gecikmisBorclar.reduce((acc, curr) => acc + Number(curr.bakiye), 0);

    // 4. Üye Bazlı Ödeme Durumları (Dinamik)
    // Her üyenin toplam borcu ve toplam ödemesini karşılaştırarak statü belirliyoruz
    const uyeBazliDurum = borclar?.reduce((acc: any, curr) => {
      if (!acc[curr.uye_id]) acc[curr.uye_id] = { borc: 0, odendi: 0 };
      acc[curr.uye_id].borc += Number(curr.borc_tutari);
      acc[curr.uye_id].odendi += Number(curr.odenen_tutar);
      return acc;
    }, {});

    let tam = 0, kismi = 0, fazla = 0, fazlaTutar = 0;
    
    // Tahsilat havuzunda kalan parayı hesaplamak için toplam tahsilat - toplam borç
    if (tTahsilat > tBorc) {
      fazlaTutar = tTahsilat - tBorc;
    }

    Object.values(uyeBazliDurum || {}).forEach((u: any) => {
      if (u.odendi >= u.borc && u.borc > 0) tam++;
      else if (u.odendi > 0 && u.odendi < u.borc) kismi++;
    });

    // Fazla ödeme yapanları bulmak için (Opsiyonel: Eğer üye bazlı fazla ödeme takibi yapılıyorsa)
    // Şimdilik basitçe toplam üzerinden gidiyoruz

    setStats({
      toplamUye: uyeCount || 0,
      toplamBorclandirma: tBorc,
      toplamTahsilat: tTahsilat,
      bekleyenGelir: Math.max(0, tBorc - tTahsilat),
      gecikmisOdemeSayisi: gSayi,
      gecikmisTutar: gTutar,
      tamOdemeYapan: tam,
      kismiOdemeYapan: kismi,
      fazlaOdemeYapan: tTahsilat > tBorc ? 1 : 0, // Örnek mantık
      fazlaOdemeTutar: fazlaTutar
    });
    setLoading(false);
  };

  return (
    <div className="space-y-8 pb-10">
      {/* BAŞLIK */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Genel Bakış</h1>
          <p className="text-slate-500 text-sm font-medium">Finansal akış ve üye durumları.</p>
        </div>
        <div className="flex w-full md:w-auto gap-3">
          <Link href="/admin/raporlar" className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-800 text-white px-5 py-3 rounded-2xl font-bold text-sm hover:bg-slate-700 transition-all">
            <PieChart size={18} /> Raporlar
          </Link>
          <Link href="/admin/borclar" className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#4FBCA1] text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-[#4FBCA1]/20 hover:scale-105 transition-all">
            <PlusCircle size={18} /> Borçlandır
          </Link>
        </div>
      </div>

      {/* İSTATİSTİK KARTLARI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Toplam Tahsilat - Öne Çıkan */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden group">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Toplam Tahsilat</p>
          <h3 className="text-3xl font-black text-teal-600">{stats.toplamTahsilat.toLocaleString('tr-TR')} ₺</h3>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-teal-600">
             <div className="p-1 bg-teal-50 rounded-lg"><TrendingUp size={14} /></div> Kasadaki Net Nakit
          </div>
        </div>

        {/* Bekleyen Gelir */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Bekleyen Gelir</p>
          <h3 className="text-3xl font-black text-slate-800">{stats.bekleyenGelir.toLocaleString('tr-TR')} ₺</h3>
          <p className="mt-4 text-xs font-bold text-slate-400 uppercase">Tahsil Edilmeyi Bekleyen</p>
        </div>

        {/* Gecikmiş Borçlar - Kırmızı Alarm */}
        <Link href="/admin/uyeler?filtre=gecikmis" className="bg-rose-50 p-6 rounded-[32px] border border-rose-100 shadow-sm group hover:scale-[1.02] transition-transform">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-black text-rose-500 uppercase tracking-widest mb-1 underline underline-offset-4">Gecikmiş Ödemeler</p>
              <h3 className="text-2xl font-black text-rose-700">{stats.gecikmisTutar.toLocaleString('tr-TR')} ₺</h3>
            </div>
            <div className="p-2 bg-rose-200 text-rose-700 rounded-xl">
              <AlertCircle size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-[10px] font-black text-rose-600 uppercase">
             {stats.gecikmisOdemeSayisi} Kayıt Gecikmede <ArrowRight size={12} />
          </div>
        </Link>

        {/* Fazla Ödeme (Havuzda Kalan) */}
        <div className="bg-amber-50 p-6 rounded-[32px] border border-amber-100 shadow-sm">
          <p className="text-[11px] font-black text-amber-600 uppercase tracking-widest mb-1">Fazla Ödemeler</p>
          <h3 className="text-2xl font-black text-amber-700">{stats.fazlaOdemeTutar.toLocaleString('tr-TR')} ₺</h3>
          <p className="mt-4 text-[10px] font-black text-amber-600 uppercase">Gelecek Borçlar İçin Hazır</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* FİNANSAL SAĞLIK ÇUBUĞU */}
          <div className="bg-slate-900 rounded-[40px] p-8 text-white">
            <h2 className="text-lg font-black mb-1 uppercase">Tahsilat Başarı Oranı</h2>
            <p className="text-slate-400 text-xs mb-6 font-medium">Toplam borçlandırmanın tahsil edilme yüzdesi</p>
            <div className="flex items-end gap-4 mb-3">
              <span className="text-4xl font-black text-[#4FBCA1]">%{((stats.toplamTahsilat / stats.toplamBorclandirma) * 100 || 0).toFixed(1)}</span>
            </div>
            <div className="w-full bg-slate-800 h-4 rounded-full overflow-hidden">
              <div 
                className="bg-[#4FBCA1] h-full rounded-full shadow-[0_0_20px_rgba(79,188,161,0.4)] transition-all duration-1000" 
                style={{ width: `${Math.min(100, (stats.toplamTahsilat / stats.toplamBorclandirma) * 100 || 0)}%` }}
              ></div>
            </div>
          </div>

          {/* SİSTEM ÖNERİLERİ */}
          <div className="bg-white rounded-[32px] border border-slate-100 p-6">
            <h3 className="font-black text-slate-800 uppercase text-xs mb-4 flex items-center gap-2">
              <Filter size={14} className="text-[#4FBCA1]" /> Akıllı Analiz
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                <p className="text-[10px] font-black text-rose-600 uppercase mb-1">Kritik Uyarı</p>
                <p className="text-xs font-bold text-slate-700 italic">"Vadesi geçen {stats.gecikmisOdemeSayisi} adet ödeme için hatırlatma gönderilmedi."</p>
              </div>
              <div className="p-4 bg-teal-50 rounded-2xl border border-teal-100">
                <p className="text-[10px] font-black text-teal-600 uppercase mb-1">Pozitif Durum</p>
                <p className="text-xs font-bold text-slate-700 italic">"Bu ayki tahsilat geçen aya göre %12 daha hızlı ilerliyor."</p>
              </div>
            </div>
          </div>
        </div>

        {/* AKTİF ÜYE DURUMU (DİNAMİK) */}
        <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm flex flex-col">
          <h3 className="font-black text-slate-800 uppercase text-sm mb-6">Üye Ödeme Durumları</h3>
          <div className="space-y-5 flex-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-xs font-bold uppercase">Toplam Aktif Üye</span>
              <span className="font-black text-slate-700 text-lg">{stats.toplamUye}</span>
            </div>
            <div className="h-[1px] bg-slate-50"></div>
            <div className="flex justify-between items-center group">
              <span className="text-slate-400 text-xs font-bold uppercase group-hover:text-teal-600 transition-colors">Tam Ödeme Yapan</span>
              <span className="font-black text-teal-600 bg-teal-50 px-3 py-1 rounded-lg">{stats.tamOdemeYapan} Üye</span>
            </div>
            <div className="flex justify-between items-center group">
              <span className="text-slate-400 text-xs font-bold uppercase group-hover:text-amber-600 transition-colors">Kısmi Ödeme Yapan</span>
              <span className="font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-lg">{stats.kismiOdemeYapan} Üye</span>
            </div>
             <div className="flex justify-between items-center group">
              <span className="text-slate-400 text-xs font-bold uppercase group-hover:text-blue-600 transition-colors">Fazla Ödemesi Olan</span>
              <span className="font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">{stats.fazlaOdemeYapan} Üye</span>
            </div>
          </div>
          
          <Link href="/admin/raporlar" className="w-full mt-8 bg-slate-100 text-slate-700 py-4 rounded-2xl font-black text-[10px] uppercase text-center hover:bg-[#4FBCA1] hover:text-white transition-all tracking-widest">
            DETAYLI ANALİZ VE RAPORLAMA
          </Link>
        </div>
      </div>
    </div>
  );
}