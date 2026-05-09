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
  ArrowRight
} from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    toplamUye: 0,
    toplamBorclandirma: 0,
    toplamTahsilat: 0,
    bekleyenGelir: 0,
    gecikmisOdemeSayisi: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    
    // 1. Üye Sayısı
    const { count: uyeCount } = await supabase.from("uyeler").select("*", { count: 'exact', head: true });

    // 2. Borçlandırmalar (Gider_Uyeler tablosundan)
    const { data: borclar } = await supabase.from("gider_uyeler").select("borc_tutari, borc_tarih");
    
    // 3. Tahsilatlar (Odemeler tablosundan)
    const { data: odemeler } = await supabase.from("odemeler").select("tutar");

    const tBorc = borclar?.reduce((acc, curr) => acc + Number(curr.borc_tutari), 0) || 0;
    const tTahsilat = odemeler?.reduce((acc, curr) => acc + Number(curr.tutar), 0) || 0;
    
    // 4. Gecikmiş Ödemeler (Tarihi geçmiş ama tahsilat havuzunda karşılığı olmayanlar - Basit mantık)
    const bugun = new Date().toISOString().split('T')[0];
    const gecikmisler = borclar?.filter(b => b.borc_tarih < bugun).length || 0;

    setStats({
      toplamUye: uyeCount || 0,
      toplamBorclandirma: tBorc,
      toplamTahsilat: tTahsilat,
      bekleyenGelir: tBorc - tTahsilat,
      gecikmisOdemeSayisi: gecikmisler
    });
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      {/* BAŞLIK VE HIZLI AKSİYONLAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Genel Bakış</h1>
          <p className="text-slate-500 text-sm font-medium">Kulübünüzün finansal sağlık durumu.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/borclandirma" className="flex items-center gap-2 bg-[#4FBCA1] text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-[#4FBCA1]/20 hover:scale-105 transition-all">
            <PlusCircle size={18} /> Hızlı Borçlandır
          </Link>
          <Link href="/admin/uyeler" className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-5 py-3 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all">
            <Users size={18} /> Üye Ekle
          </Link>
        </div>
      </div>

      {/* İSTATİSTİK KARTLARI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Toplam Borçlandırma */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Toplam Tahakkuk</p>
              <h3 className="text-2xl font-black text-slate-800">{stats.toplamBorclandirma.toLocaleString('tr-TR')} ₺</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <TrendingUp size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-blue-600">
             <ArrowUpRight size={14} /> Toplam Borç Kaydı
          </div>
        </div>

        {/* Toplam Tahsilat */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Toplam Tahsilat</p>
              <h3 className="text-2xl font-black text-teal-600">{stats.toplamTahsilat.toLocaleString('tr-TR')} ₺</h3>
            </div>
            <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl">
              <TrendingUp size={24} />
            </div>
          </div>
          <p className="mt-4 text-xs font-bold text-slate-400">Kasaya giren toplam nakit</p>
        </div>

        {/* Bekleyen Gelir */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Bekleyen Gelir</p>
              <h3 className="text-2xl font-black text-amber-600">{stats.bekleyenGelir.toLocaleString('tr-TR')} ₺</h3>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <Clock size={24} />
            </div>
          </div>
          <p className="mt-4 text-xs font-bold text-slate-400">Tahsil edilmesi gereken net tutar</p>
        </div>

        {/* Gecikmiş Ödemeler */}
        <Link href="/admin/uyeler?filtre=gecikmis" className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:border-rose-200 transition-all group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1 text-rose-500">Gecikmiş Ödemeler</p>
              <h3 className="text-2xl font-black text-rose-600">{stats.gecikmisOdemeSayisi} Kayıt</h3>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl group-hover:bg-rose-600 group-hover:text-white transition-all">
              <AlertCircle size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-rose-500 underline underline-offset-4">
             Üyeleri Listele <ArrowRight size={14} />
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* SOL: Özet Durum ve Öneriler */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#1E293B] rounded-[40px] p-8 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-xl font-black mb-2 uppercase tracking-tighter">Finansal Sağlık Skoru</h2>
              <p className="text-slate-400 text-sm mb-6">Tahsilat oranınız borçlandırmaya göre %{((stats.toplamTahsilat / stats.toplamBorclandirma) * 100 || 0).toFixed(1)}</p>
              <div className="w-full bg-slate-700 h-3 rounded-full overflow-hidden">
                <div 
                  className="bg-[#4FBCA1] h-full rounded-full transition-all duration-1000" 
                  style={{ width: `${(stats.toplamTahsilat / stats.toplamBorclandirma) * 100 || 0}%` }}
                ></div>
              </div>
            </div>
            <div className="absolute top-[-20%] right-[-10%] opacity-10">
              <TrendingUp size={200} />
            </div>
          </div>

          {/* EK ÖNERİ: Son İşlemler Listesi buraya gelebilir */}
          <div className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm">
            <h3 className="font-black text-slate-800 uppercase text-sm mb-4">Sistem Önerileri</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div>
                <p className="text-xs font-bold text-slate-600 uppercase tracking-tighter">
                   Ödemesi 30 günü geçen 5 üye var. Hatırlatma SMS'i gönderilsin mi?
                </p>
              </div>
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                <p className="text-xs font-bold text-slate-600 uppercase tracking-tighter">
                   Bu ayki tahsilat hedefinin %80'ine ulaşıldı.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* SAĞ: Hızlı İstatistik */}
        <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm">
          <h3 className="font-black text-slate-800 uppercase text-sm mb-6">Aktif Durum</h3>
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-xs font-bold uppercase">Toplam Üye</span>
              <span className="font-black text-slate-700">{stats.toplamUye}</span>
            </div>
            <div className="h-[1px] bg-slate-100"></div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-xs font-bold uppercase">Tam Ödeme Yapan</span>
              <span className="font-black text-teal-600">12 Üye</span>
            </div>
             <div className="h-[1px] bg-slate-100"></div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-xs font-bold uppercase">Kısmi Ödeme</span>
              <span className="font-black text-amber-600">3 Üye</span>
            </div>
          </div>
          
          <button className="w-full mt-10 bg-slate-100 text-slate-700 py-4 rounded-2xl font-black text-xs uppercase hover:bg-[#4FBCA1] hover:text-white transition-all">
            Detaylı Rapor Al
          </button>
        </div>
      </div>
    </div>
  );
}