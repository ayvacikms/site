"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  FileText, 
  Download, 
  Table as TableIcon, 
  Calendar, 
  Search,
  Filter,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function RaporlarPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
    `) // 'ad' yerine 'ad' kullanıldı, 'tc_no' şemada olmadığı için çıkarıldı.
    .order("borc_tarih", { ascending: false });

  if (error) {
    console.error("Supabase Hatası:", error.message);
    setLoading(false);
    return;
  }

  setData(reportData || []);
  setLoading(false);
};

  // EXCEL ÇIKTISI (Sayısal Format Korumalı)
  const exportToExcel = () => {
    // Veriyi Excel'in anlayacağı saf sayısal formata dönüştür
    const excelData = data.map(item => ({
      "Üye Ad Soyad": item.uyeler?.ad,
      "Borç Tarihi": item.borc_tarih,
      "Borç Tutarı": Number(item.borc_tutari), // Kesinlikle Number
      "Ödenen": Number(item.odenen_tutar),    // Kesinlikle Number
      "Kalan Bakiye": Number(item.bakiye),    // Kesinlikle Number
      "Durum": item.durum === 'tam' ? 'Ödendi' : 'Bekliyor'
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Genel Rapor");

    // Excel dosyasını indir
    XLSX.writeFile(workbook, `Ayvacik_Rapor_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // PDF ÇIKTISI
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Ayvacik MS - Finansal Rapor", 14, 15);
    
    const tableColumn = ["Üye", "Tarih", "Borç", "Ödenen", "Bakiye", "Durum"];
    const tableRows = data.map(item => [
      item.uyeler?.ad,
      item.borc_tarih,
      `${item.borc_tutari} TL`,
      `${item.odenen_tutar} TL`,
      `${item.bakiye} TL`,
      item.durum
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 25,
      theme: 'grid',
      headStyles: { fillColor: [79, 188, 161] }
    });

    doc.save("finansal-rapor.pdf");
  };

  return (
    <div className="space-y-6 pb-10">
      {/* ÜST BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-800 uppercase">Finansal Raporlar</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Verileri dışa aktar ve analiz et</p>
          </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={exportToExcel}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
          >
            <TableIcon size={18} /> EXCEL AL
          </button>
          <button 
            onClick={exportToPDF}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-rose-600 text-white px-5 py-3 rounded-2xl font-bold text-sm hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
          >
            <FileText size={18} /> PDF AL
          </button>
        </div>
      </div>

      {/* FİLTRELER */}
      <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Başlangıç Tarihi</label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="date" className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#4FBCA1] transition-all" />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Bitiş Tarihi</label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="date" className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#4FBCA1] transition-all" />
          </div>
        </div>
        <div className="flex items-end">
          <button className="w-full bg-slate-800 text-white py-3 rounded-2xl font-bold text-sm hover:bg-slate-700 transition-all">
            Filtrele
          </button>
        </div>
      </div>

      {/* ÖNİZLEME TABLOSU */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
          <h3 className="font-black text-slate-800 uppercase text-sm">Rapor Önizleme</h3>
          <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1 rounded-full">{data.length} Kayıt</span>
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
                <tr><td colSpan={6} className="p-10 text-center font-bold text-slate-400">Veriler hazırlanıyor...</td></tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-sm font-bold text-slate-700">{item.uyeler?.ad}</td>
                    <td className="p-4 text-sm text-slate-500">{item.borc_tarih}</td>
                    <td className="p-4 text-sm font-black text-slate-800">{item.borc_tutari} ₺</td>
                    <td className="p-4 text-sm font-bold text-teal-600">{item.odenen_tutar} ₺</td>
                    <td className="p-4 text-sm font-bold text-rose-600">{item.bakiye} ₺</td>
                    <td className="p-4">
                      <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase ${
                        item.durum === 'tam' ? 'bg-teal-50 text-teal-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {item.durum}
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