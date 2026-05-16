"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { 
  FileText, 
  Table as TableIcon, 
  Calendar, 
  Search,
  Filter,
  ArrowLeft,
  TrendingUp,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function RaporlarPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Gelişmiş Filtre State'leri
  const [searchTerm, setSearchTerm] = useState("");
  const [durumFilter, setDurumFilter] = useState("Hepsi");
  const [dateRange, setDateRange] = useState({ baslangic: "", bitis: "" });

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    const { data: reportData, error } = await supabase
      .from("gider_uyeler")
      .select(`
        id,
        borc_tutari,
        borc_tarih,
        odenen_tutar,
        bakiye,
        durum,
        uyeler ( ad ) 
      `)
      .order("borc_tarih", { ascending: false });

    if (error) {
      console.error("Supabase Hatası:", error.message);
      setLoading(false);
      return;
    }

    setData(reportData || []);
    setLoading(false);
  };

  // Hızlı Tarih Seçim Yardımcısı
  const setQuickDate = (rangeType: "buAy" | "gecenAy" | "buYil") => {
    const now = new Date();
    let start = "";
    let end = now.toISOString().split("T")[0];

    if (rangeType === "buAy") {
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    } else if (rangeType === "gecenAy") {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
      end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];
    } else if (rangeType === "buYil") {
      start = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
    }

    setDateRange({ baslangic: start, bitis: end });
  };

  // --- HAFIZADA ANLIK FİLTRELEME MANTIĞI (useMemo) ---
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // 1. Üye Adı Filtresi
      const matchesSearch = item.uyeler?.ad?.toLowerCase().includes(searchTerm.toLowerCase());

      // 2. Durum Filtresi
      const matchesDurum = 
        durumFilter === "Hepsi" ? true :
        durumFilter === "Odedi" ? item.durum === "tam" :
        item.durum !== "tam"; // Bekliyor veya Kısmi

      // 3. Tarih Aralığı Filtresi
      let matchesDate = true;
      if (dateRange.baslangic) {
        matchesDate = matchesDate && item.borc_tarih >= dateRange.baslangic;
      }
      if (dateRange.bitis) {
        matchesDate = matchesDate && item.borc_tarih <= dateRange.bitis;
      }

      return matchesSearch && matchesDurum && matchesDate;
    });
  }, [data, searchTerm, durumFilter, dateRange]);

  // --- DİNAMİK İSTATİSTİKLER (Filtrelere Göre Değişir) ---
  const totals = useMemo(() => {
    return filteredData.reduce(
      (acc, curr) => {
        acc.topBorc += Number(curr.borc_tutari || 0);
        acc.topOdenen += Number(curr.odenen_tutar || 0);
        acc.topBakiye += Number(curr.bakiye || 0);
        return acc;
      },
      { topBorc: 0, topOdenen: 0, topBakiye: 0 }
    );
  }, [filteredData]);


  // EXCEL ÇIKTISI (Filtrelenmiş Veriyi ve Toplam Satırını Alır)
  const exportToExcel = () => {
    const excelData = filteredData.map(item => ({
      "Üye Ad Soyad": item.uyeler?.ad,
      "Borç Tarihi": item.borc_tarih,
      "Borç Tutarı": Number(item.borc_tutari),
      "Ödenen": Number(item.odenen_tutar),
      "Kalan Bakiye": Number(item.bakiye),
      "Durum": item.durum === 'tam' ? 'Ödendi' : 'Bekliyor'
    }));

    // Altına Toplam Satırı Ekleme
    excelData.push({
      "Üye Ad Soyad": "TOPLAM",
      "Borç Tarihi": "",
      "Borç Tutarı": totals.topBorc,
      "Ödenen": totals.topOdenen,
      "Kalan Bakiye": totals.topBakiye,
      "Durum": ""
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Filtrelenmiş Rapor");
    XLSX.writeFile(workbook, `Ayvacik_Filtreli_Rapor_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // PDF ÇIKTISI
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Ayvacik MS - Dinansal Rapor (Filtrelenmis)", 14, 15);
    
    const tableColumn = ["Uye", "Tarih", "Borc", "Odenen", "Bakiye", "Durum"];
    const tableRows = filteredData.map(item => [
      item.uyeler?.ad,
      item.borc_tarih,
      `${item.borc_tutari} TL`,
      `${item.odenen_tutar} TL`,
      `${item.bakiye} TL`,
      item.durum === 'tam' ? 'Odendi' : 'Bekliyor'
    ]);

    // PDF Sonuna Toplam Satırı Ekleme
    tableRows.push([
      "TOPLAM",
      "",
      `${totals.topBorc} TL`,
      `${totals.topOdenen} TL`,
      `${totals.topBakiye} TL`,
      ""
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 25,
      theme: 'grid',
      headStyles: { fillColor: [79, 188, 161] }
    });

    doc.save("filtresel-finansal-rapor.pdf");
  };

  return (
    <div className="space-y-6 pb-20">
      {/* ÜST BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-slate-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Finansal Raporlar</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Dinamik Filtreleme ve Esnek Analiz</p>
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={exportToExcel}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3.5 rounded-2xl font-black text-xs tracking-wider hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 uppercase"
          >
            <TableIcon size={16} /> Excel Aktar
          </button>
          <button 
            onClick={exportToPDF}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-rose-600 text-white px-6 py-3.5 rounded-2xl font-black text-xs tracking-wider hover:bg-rose-700 transition-all shadow-xl shadow-rose-100 uppercase"
          >
            <FileText size={16} /> PDF Aktar
          </button>
        </div>
      </div>

      {/* DİNAMİK İSTATİSTİK KARTLARI (KPI) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="p-4 bg-slate-50 rounded-2xl text-slate-700"><TrendingUp size={24}/></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtreli Toplam Borç</p>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-0.5">{totals.topBorc.toLocaleString('tr-TR')} ₺</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600"><CheckCircle2 size={24}/></div>
          <div>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Filtreli Toplam Tahsilat</p>
            <h3 className="text-2xl font-black text-emerald-600 tracking-tight mt-0.5">{totals.topOdenen.toLocaleString('tr-TR')} ₺</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="p-4 bg-rose-50 rounded-2xl text-rose-600"><AlertCircle size={24}/></div>
          <div>
            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Filtreli Toplam Alacak</p>
            <h3 className="text-2xl font-black text-rose-600 tracking-tight mt-0.5">{totals.topBakiye.toLocaleString('tr-TR')} ₺</h3>
          </div>
        </div>
      </div>

      {/* GELİŞMİŞ FİLTRELEME PANELİ */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Arama */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Üye Adı Ara</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Üye adı yazın..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#4FBCA1] outline-none transition-all" 
              />
            </div>
          </div>

          {/* Durum Filtresi */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Ödeme Durumu</label>
            <select 
              value={durumFilter} 
              onChange={(e) => setDurumFilter(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#4FBCA1] outline-none transition-all"
            >
              <option value="Hepsi">Tüm Durumlar</option>
              <option value="Odedi">Sadece Ödeyenler</option>
              <option value="Bekliyor">Kalan Bakiyesi Olanlar</option>
            </select>
          </div>

          {/* Başlangıç Tarihi */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Başlangıç Tarihi</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="date" 
                value={dateRange.baslangic}
                onChange={(e) => setDateRange({ ...dateRange, baslangic: e.target.value })}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#4FBCA1] outline-none transition-all" 
              />
            </div>
          </div>

          {/* Bitiş Tarihi */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Bitiş Tarihi</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="date" 
                value={dateRange.bitis}
                onChange={(e) => setDateRange({ ...dateRange, bitis: e.target.value })}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#4FBCA1] outline-none transition-all" 
              />
            </div>
          </div>
        </div>

        {/* Hızlı Tarih Seçim Butonları & Temizle */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-50">
          <div className="flex gap-2">
            <button onClick={() => setQuickDate("buAy")} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-bold text-slate-600 transition-colors">Bu Ay</button>
            <button onClick={() => setQuickDate("gecenAy")} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-bold text-slate-600 transition-colors">Geçen Ay</button>
            <button onClick={() => setQuickDate("buYil")} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-bold text-slate-600 transition-colors">Bu Yıl</button>
          </div>
          {(searchTerm || durumFilter !== "Hepsi" || dateRange.baslangic || dateRange.bitis) && (
            <button 
              onClick={() => { setSearchTerm(""); setDurumFilter("Hepsi"); setDateRange({ baslangic: "", bitis: "" }); }} 
              className="text-rose-500 hover:text-rose-700 text-[10px] font-black uppercase tracking-wider transition-colors"
            >
              Filtreleri Temizle
            </button>
          )}
        </div>
      </div>

      {/* ÖNİZLEME TABLOSU */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-black text-slate-800 uppercase text-xs tracking-wider">Rapor Önizleme</h3>
          <span className="text-[10px] font-black bg-slate-900 text-white px-3 py-1 rounded-full">{filteredData.length} Kayıt Listelendi</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-4 text-[11px] font-black text-slate-400 uppercase">Üye</th>
                <th className="p-4 text-[11px] font-black text-slate-400 uppercase">Tarih</th>
                <th className="p-4 text-[11px] font-black text-slate-400 uppercase">Borç</th>
                <th className="p-4 text-[11px] font-black text-slate-400 uppercase">Ödenen</th>
                <th className="p-4 text-[11px] font-black text-slate-400 uppercase">Kalan</th>
                <th className="p-4 text-[11px] font-black text-slate-400 uppercase">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={6} className="p-10 text-center font-bold text-slate-400 animate-pulse">Veriler hazırlanıyor...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={6} className="p-10 text-center font-bold text-slate-400">Aranan kriterlere uygun kayıt bulunamadı.</td></tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="p-4 text-sm font-bold text-slate-700">{item.uyeler?.ad}</td>
                    <td className="p-4 text-sm text-slate-500">{new Date(item.borc_tarih).toLocaleDateString('tr-TR')}</td>
                    <td className="p-4 text-sm font-black text-slate-800">{Number(item.borc_tutari).toLocaleString('tr-TR')} ₺</td>
                    <td className="p-4 text-sm font-bold text-teal-600">{Number(item.odenen_tutar).toLocaleString('tr-TR')} ₺</td>
                    <td className="p-4 text-sm font-bold text-rose-600">{Number(item.bakiye).toLocaleString('tr-TR')} ₺</td>
                    <td className="p-4">
                      <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase ${
                        item.durum === 'tam' ? 'bg-teal-50 text-teal-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {item.durum === 'tam' ? 'Ödendi' : 'Bekliyor'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}