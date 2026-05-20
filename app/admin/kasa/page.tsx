"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Plus, Search, Calendar, Wallet, Landmark, 
  ArrowUpCircle, ArrowDownCircle, Filter, Trash2, X, 
  Building2, Banknote, ChevronDown, FileSpreadsheet, FileText, ArrowRightLeft
} from "lucide-react";
import toast from "react-hot-toast";

// --- TİP TANIMLAMALARI ---
interface Cari {
  id: string;
  cari_ad: string;
}

interface Uye {
  id: string;
  ad: string;
}

interface KasaHareketi {
  id: string;
  islem_tipi: string;
  odeme_yontemi: string;
  tutar: number;
  aciklama: string;
  islem_tarihi: string;
  ilgili_id: string;
  cariler?: Cari | null;
}

interface TransferKaydi {
  id: string;
  transfer_tipi: string;
  tutar: number;
  aciklama: string;
  islem_tarihi: string;
}

export default function KasaPage() {
  const [hareketler, setHareketler] = useState<KasaHareketi[]>([]);
  const [transferler, setTransferler] = useState<TransferKaydi[]>([]);
  const [cariler, setCariler] = useState<Cari[]>([]);
  const [uyeler, setUyeler] = useState<Uye[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modallar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"kasa" | "transfer">("kasa");

  // Filtreler
  const [searchTerm, setSearchTerm] = useState("");
  const [filterYontem, setFilterYontem] = useState("all");
  const [filterTip, setFilterTip] = useState("all");

  // Arama Arama Kontrolleri (Formlar için)
  const [cariSearch, setCariSearch] = useState("");
  const [kaynakUyeSearch, setKaynakUyeSearch] = useState("");
  const [hedefUyeSearch, setHedefUyeSearch] = useState("");

  // Standart Kasa Hareketi Formu
  const [formData, setFormData] = useState({
    islem_tipi: "Giriş",
    odeme_yontemi: "Banka/EFT",
    tutar: "",
    aciklama: "",
    islem_tarihi: new Date().toISOString().split('T')[0],
    cari_id: ""
  });

  // Gelişmiş Çapraz Transfer (Virman) Formu
  const [transferForm, setTransferForm] = useState({
    transfer_tipi: "uye_to_uye_borc",
    kaynak_uye_id: "",
    hedef_uye_id: "",
    kaynak_cari_id: "",
    hedef_cari_id: "",
    tutar: "",
    aciklama: "",
    tarih: new Date().toISOString().split('T')[0]
  });

  // Veri Çekme Fonksiyonları
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Kasa Hareketlerini Çek
      const { data: kasaData, error: kasaErr } = await supabase
        .from("kasa_hareketler")
        .select(`id, islem_tipi, odeme_yontemi, tutar, aciklama, islem_tarihi, ilgili_id, cariler(id, cari_ad)`)
        .order("islem_tarihi", { ascending: false });

      if (kasaErr) throw kasaErr;
      setHareketler(kasaData || []);

      // 2. Transfer Kayıtlarını Çek
      const { data: transData, error: transErr } = await supabase
        .from("transferler")
        .select("id, transfer_tipi, tutar, aciklama, islem_tarihi")
        .order("islem_tarihi", { ascending: false });

      if (transErr) throw transErr;
      setTransferler(transData || []);

      // 3. Carileri Çek
      const { data: cariData } = await supabase.from("cariler").select("id, cari_ad").order("cari_ad");
      setCariler(cariData || []);

      // 4. Üyeleri Çek
      const { data: uyeData } = await supabase.from("uyeler").select("id, ad").order("ad");
      setUyeler(uyeData || []);

    } catch (error: any) {
      toast.error("Veriler yüklenirken hata oluştu: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- HESAPLAMALAR VE ÖZET MATEMATİĞİ ---
  const kasanet = useMemo(() => {
    return hareketler.reduce((acc, curr) => {
      const t = Number(curr.tutar) || 0;
      if (curr.islem_tipi === "Giriş" || curr.islem_tipi === "gelir") return acc + t;
      if (curr.islem_tipi === "Çıkış" || curr.islem_tipi === "gider") return acc - t;
      return acc;
    }, 0);
  }, [hareketler]);

  const bankaToplam = useMemo(() => {
    return hareketler.reduce((acc, curr) => {
      if (!curr.odeme_yontemi?.includes("Banka")) return acc;
      const t = Number(curr.tutar) || 0;
      return curr.islem_tipi === "Giriş" || curr.islem_tipi === "gelir" ? acc + t : acc - t;
    }, 0);
  }, [hareketler]);

  const nakitToplam = useMemo(() => {
    return kasanet - bankaToplam;
  }, [kasanet, bankaToplam]);

  // --- FİLTRELENMİŞ LİSTELER ---
  const filteredHareketler = useMemo(() => {
    return hareketler.filter(h => {
      const matchesSearch = h.aciklama?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            h.cariler?.cari_ad?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesYontem = filterYontem === "all" || h.odeme_yontemi === filterYontem;
      const matchesTip = filterTip === "all" || h.islem_tipi === filterTip;
      return matchesSearch && matchesYontem && matchesTip;
    });
  }, [hareketler, searchTerm, filterYontem, filterTip]);

  const filteredTransferler = useMemo(() => {
    return transferler.filter(t => 
      t.aciklama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.transfer_tipi.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [transferler, searchTerm]);

  // --- REHBER SEARCH SEÇİMLERİ ---
  const filteredCariler = cariler.filter(c => c.cari_ad.toLowerCase().includes(cariSearch.toLowerCase()));
  const filteredKaynakUyeler = uyeler.filter(u => u.ad.toLowerCase().includes(kaynakUyeSearch.toLowerCase()));
  const filteredHedefUyeler = uyeler.filter(u => u.ad.toLowerCase().includes(hedefUyeSearch.toLowerCase()));

  // --- STANDART KASA KAYDI EKLEME ---
  const handleKasaKaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("kasa_hareketler").insert([{
        islem_tipi: formData.islem_tipi,
        odeme_yontemi: formData.odeme_yontemi,
        tutar: parseFloat(formData.tutar),
        aciklama: formData.aciklama,
        islem_tarihi: formData.islem_tarihi,
        ilgili_id: formData.cari_id || null
      }]);

      if (error) throw error;
      toast.success("Kasa hareketi başarıyla işlendi.");
      setIsModalOpen(false);
      setFormData({ islem_tipi:"Giriş", odeme_yontemi:"Banka/EFT", tutar:"", aciklama:"", islem_tarihi: new Date().toISOString().split('T')[0], cari_id:"" });
      fetchData();
    } catch (error: any) {
      toast.error("Hata: " + error.message);
    }
  };

  // --- GELİŞMİŞ ÇAPRAZ TRANSFER (VİRMAN) KAYDETME ---
  const handleTransferKaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    const tutarNum = parseFloat(transferForm.tutar);
    if (!tutarNum || tutarNum <= 0) return toast.error("Lütfen geçerli bir tutar girin.");

    try {
      // RPC veya Manuel Sıralı Transaction kurgusunu simüle eden tetikleyici/veri girişi:
      // Veritabanındaki Trigger mimarimiz sayesinde biz sadece 'transferler' tablosuna ana kaydı atacağız.
      const { error } = await supabase.from("transferler").insert([{
        transfer_tipi: transferForm.transfer_tipi,
        tutar: tutarNum,
        aciklama: transferForm.aciklama,
        islem_tarihi: transferForm.tarih,
        kaynak_uye_id: transferForm.kaynak_uye_id || null,
        hedef_uye_id: transferForm.hedef_uye_id || null,
        kaynak_cari_id: transferForm.kaynak_cari_id || null,
        hedef_cari_id: transferForm.hedef_cari_id || null
      }]);

      if (error) throw error;
      
      toast.success("Çapraz transfer/virman işlemi başarıyla tamamlandı!");
      setIsTransferModalOpen(false);
      setTransferForm({
        transfer_tipi: "uye_to_uye_borc", kaynak_uye_id: "", hedef_uye_id: "",
        kaynak_cari_id: "", hedef_cari_id: "", tutar: "", aciklama: "",
        tarih: new Date().toISOString().split('T')[0]
      });
      fetchData();
    } catch (error: any) {
      toast.error("Transfer hatası: " + error.message);
    }
  };

  // --- EŞ GÜDÜMLÜ SİLME (CASCADE TETİKLEYİCİSİ) ---
  const handleKasaSil = async (id: string) => {
    if (!confirm("Bu hareketi silmek istediğinize emin misiniz?")) return;
    const { error } = await supabase.from("kasa_hareketler").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Kayıt silindi."); fetchData(); }
  };

  const handleTransferSil = async (id: string) => {
    if (!confirm("Bu virman işlemini iptal etmek istediğinize emin misiniz? Bağlı TÜM üye, cari ve kasa hareketleri otomatik olarak geri alınacaktır!")) return;
    
    // Veritabanında ON DELETE CASCADE kurulu olduğu için transferler tablosundan silmek her şeyi temizler.
    const { error } = await supabase.from("transferler").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Virman zinciri ve bağlı tüm kayıtlar iptal edildi!"); fetchData(); }
  };

  const formatTipText = (tip: string) => {
    const map: any = {
      uye_to_uye_borc: "Üyeden Üyeye (Borç Devri)",
      uye_to_uye_alacak: "Üyeden Üyeye (Alacak Devri)",
      kasa_to_uye: "Kasadan Üyeye Transfer",
      uye_to_cari: "Üyeden Cariye Mahsup",
      cari_to_uye: "Cariden Üyeye Mahsup"
    };
    return map[tip] || tip;
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 bg-slate-50/50 min-h-screen">
      
      {/* ÜST BAŞLIK VE HIZLI AKSİYONLAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">Kasa & Virman Yönetimi</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Nakit akışını, gelir/gider dengesini ve üyeler arası borç devirlerini yönetin.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={() => setIsTransferModalOpen(true)} className="flex-1 sm:flex-none bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/60 px-5 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer">
            <ArrowRightLeft size={15}/> Çapraz Virman Yap
          </button>
          <button onClick={() => setIsModalOpen(true)} className="flex-1 sm:flex-none bg-slate-900 hover:bg-slate-800 text-white px-5 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer">
            <Plus size={16}/> Yeni Kasa İşlemi
          </button>
        </div>
      </div>

      {/* MALİ ÖZET KARTLARI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex items-center justify-between group hover:border-teal-500/30 transition-all">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kasa Net Mevcut</p>
            <h3 className={`text-3xl font-black tracking-tight ${kasanet >= 0 ? "text-teal-600":"text-rose-600"}`}>
              {kasanet.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
            </h3>
          </div>
          <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all">
            <Wallet size={20} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex items-center justify-between group hover:border-blue-500/30 transition-all">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Banka (EFT/Havale) Toplamı</p>
            <h3 className="text-3xl font-black tracking-tight text-blue-600">
              {bankaToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
            </h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all">
            <Landmark size={20} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex items-center justify-between group hover:border-amber-500/30 transition-all">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Elden Nakit Toplamı</p>
            <h3 className="text-3xl font-black tracking-tight text-amber-600">
              {nakitToplam.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
            </h3>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all">
            <Banknote size={20} />
          </div>
        </div>
      </div>

      {/* SEKME SEÇİMİ VE FİLTRELEME BARRI */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Sekme Değiştirici */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-full md:w-auto">
            <button onClick={() => setActiveTab("kasa")} className={`flex-1 md:flex-none px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${activeTab === "kasa" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}>
              Kasa Defteri
            </button>
            <button onClick={() => setActiveTab("transfer")} className={`flex-1 md:flex-none px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${activeTab === "transfer" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}>
              Virman & Transferler
            </button>
          </div>

          {/* Arama ve Filtreler */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Açıklama veya cari ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-50 pl-10 pr-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 outline-none border border-transparent focus:border-slate-200 focus:bg-white transition-all"/>
            </div>

            {activeTab === "kasa" && (
              <>
                <select value={filterTip} onChange={(e) => setFilterTip(e.target.value)} className="bg-slate-50 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-600 border border-transparent outline-none cursor-pointer">
                  <option value="all">Tüm Yönler</option>
                  <option value="Giriş">Giriş (+)</option>
                  <option value="Çıkış">Çıkış (-)</option>
                </select>
                <select value={filterYontem} onChange={(e) => setFilterYontem(e.target.value)} className="bg-slate-50 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-600 border border-transparent outline-none cursor-pointer">
                  <option value="all">Tüm Yöntemler</option>
                  <option value="Banka/EFT">🏦 Banka</option>
                  <option value="Nakit">💵 Nakit</option>
                </select>
              </>
            )}
          </div>
        </div>
      </div>

      {/* DATA LİSTELEME ALANLARI */}
      {loading ? (
        <div className="bg-white p-16 rounded-3xl text-center border border-slate-100 font-bold text-slate-400 text-sm">Veriler senkronize ediliyor...</div>
      ) : activeTab === "kasa" ? (
        
        // TABLO: KASA HAREKETLERİ
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100">
                  <th className="p-4.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">İşlem Tarihi</th>
                  <th className="p-4.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">Tür / Yöntem</th>
                  <th className="p-4.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">İlgili Muhatap</th>
                  <th className="p-4.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">Açıklama</th>
                  <th className="p-4.5 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Tutar</th>
                  <th className="p-4.5 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-bold text-slate-700">
                {filteredHareketler.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-400 font-medium">Aranan kriterlere uygun kasa hareketi bulunamadı.</td>
                  </tr>
                ) : filteredHareketler.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="p-4.5 text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400"/>
                        {new Date(h.islem_tarihi).toLocaleDateString("tr-TR")}
                      </div>
                    </td>
                    <td className="p-4.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black ${h.islem_tipi === "Giriş" || h.islem_tipi === "gelir" ? "bg-teal-50 text-teal-700" : "bg-rose-50 text-rose-700"}`}>
                        {h.islem_tipi === "Giriş" || h.islem_tipi === "gelir" ? <ArrowUpCircle size={13}/> : <ArrowDownCircle size={13}/ >}
                        {h.odeme_yontemi}
                      </span>
                    </td>
                    <td className="p-4.5 whitespace-nowrap text-slate-900">
                      {h.cariler ? (
                        <span className="flex items-center gap-1.5 text-slate-700">
                          <Building2 size={13} className="text-slate-400" /> {h.cariler.cari_ad}
                        </span>
                      ) : <span className="text-slate-400 font-normal">Serbest Hareket</span>}
                    </td>
                    <td className="p-4.5 max-w-xs truncate text-slate-500 font-medium">{h.aciklama || "-"}</td>
                    <td className={`p-4.5 text-right font-black text-sm whitespace-nowrap ${h.islem_tipi === "Giriş" || h.islem_tipi === "gelir" ? "text-teal-600":"text-rose-600"}`}>
                      {h.islem_tipi === "Giriş" || h.islem_tipi === "gelir" ? "+" : "-"}{h.tutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
                    </td>
                    <td className="p-4.5 text-center whitespace-nowrap">
                      <button onClick={() => handleKasaSil(h.id)} className="p-2 text-slate-300 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-all cursor-pointer opacity-0 group-hover:opacity-100">
                        <Trash2 size={15}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        
        // TABLO: ÇAPRAZ VİRMANLAR
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100">
                  <th className="p-4.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">İşlem Tarihi</th>
                  <th className="p-4.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">Transfer Modeli</th>
                  <th className="p-4.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">Gerekçe / Açıklama</th>
                  <th className="p-4.5 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Tutar</th>
                  <th className="p-4.5 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">İptal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-bold text-slate-700">
                {filteredTransferler.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-slate-400 font-medium">Kayıtlı çapraz transfer (virman) hareketi bulunamadı.</td>
                  </tr>
                ) : filteredTransferler.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="p-4.5 text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400"/>
                        {new Date(t.islem_tarihi).toLocaleDateString("tr-TR")}
                      </div>
                    </td>
                    <td className="p-4.5 whitespace-nowrap">
                      <span className="bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg text-[11px] font-black inline-flex items-center gap-1.5">
                        <ArrowRightLeft size={12}/>
                        {formatTipText(t.transfer_tipi)}
                      </span>
                    </td>
                    <td className="p-4.5 text-slate-500 font-medium max-w-sm truncate">{t.aciklama || "-"}</td>
                    <td className="p-4.5 text-right font-black text-sm text-slate-900 whitespace-nowrap">
                      {t.tutar.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺
                    </td>
                    <td className="p-4.5 text-center whitespace-nowrap">
                      <button onClick={() => handleTransferSil(t.id)} className="p-2 text-slate-300 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-all cursor-pointer opacity-0 group-hover:opacity-100" title="Tüm akışı iptal et">
                        <Trash2 size={15}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- MODAL 1: STANDART KASA HAREKETİ --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg p-6 relative border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setIsModalOpen(false)} className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 p-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"><X size={16}/></button>
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Yeni Kasa İşlemi Girişi</h3>
              <p className="text-xs text-slate-400 font-medium">Kasaya direkt giriş veya çıkış hareketleri tanımlayın.</p>
            </div>
            
            <form onSubmit={handleKasaKaydet} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">İşlem Yönü</label>
                  <select value={formData.islem_tipi} className="w-full p-3.5 rounded-xl bg-slate-50 font-bold text-xs mt-1 outline-none border-2 border-transparent focus:border-slate-200 cursor-pointer" onChange={(e)=>setFormData({...formData, islem_tipi: e.target.value})}>
                    <option value="Giriş">🟢 Kasa Girişi (+)</option>
                    <option value="Çıkış">🔴 Kasa Çıkışı (-)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Ödeme Yöntemi</label>
                  <select value={formData.odeme_yontemi} className="w-full p-3.5 rounded-xl bg-slate-50 font-bold text-xs mt-1 outline-none border-2 border-transparent focus:border-slate-200 cursor-pointer" onChange={(e)=>setFormData({...formData, odeme_yontemi: e.target.value})}>
                    <option value="Banka/EFT">🏦 Banka (EFT/Havale)</option>
                    <option value="Nakit">💵 Elden Nakit</option>
                  </select>
                </div>
              </div>

              {/* Muhatap Seçimi (Cari Rehberi) */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">İlişkili Cari / Esnaf (Opsiyonel)</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input type="text" placeholder="Rehberde ara ve filtrele..." value={cariSearch} onChange={(e) => setCariSearch(e.target.value)} className="w-full bg-slate-50 pl-9 pr-4 py-3 rounded-xl text-xs font-bold text-slate-700 outline-none border-2 border-transparent focus:border-slate-200" />
                </div>
                {cariSearch && (
                  <div className="bg-white border border-slate-100 rounded-xl max-h-36 overflow-y-auto p-1 shadow-lg space-y-0.5">
                    {filteredCariler.map(c => (
                      <button key={c.id} type="button" onClick={() => { setFormData({...formData, cari_id: c.id}); setCariSearch(c.cari_ad); }} className="w-full text-left p-2 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-2 cursor-pointer">
                        <Building2 size={12} className="text-slate-400"/> {c.cari_ad}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">İşlem Tarihi</label>
                  <input required type="date" value={formData.islem_tarihi} className="w-full p-3.5 rounded-xl bg-slate-50 font-bold text-xs mt-1 outline-none border-2 border-transparent focus:border-slate-200" onChange={(e)=>setFormData({...formData, islem_tarihi: e.target.value})}/>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Tutar (TL)</label>
                  <input required type="number" step="0.01" placeholder="0.00" value={formData.tutar} className="w-full p-3.5 rounded-xl bg-slate-50 font-black text-xs mt-1 outline-none border-2 border-transparent focus:border-slate-200" onChange={(e)=>setFormData({...formData, tutar: e.target.value})}/>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Açıklama</label>
                <textarea required placeholder="İşlem gerekçesini yazınız..." value={formData.aciklama} className="w-full p-3.5 rounded-xl bg-slate-50 font-bold h-20 text-xs mt-1 border-2 border-transparent focus:border-slate-200 outline-none resize-none" onChange={(e)=>setFormData({...formData, aciklama: e.target.value})}/>
              </div>

              <button type="submit" className="w-full bg-slate-900 text-white p-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all cursor-pointer">
                KAYDI İŞLE
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: GELİŞMİŞ ÇAPRAZ TRANSFER (VİRMAN) MODALI --- */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl p-6 relative border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setIsTransferModalOpen(false)} className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 p-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"><X size={16}/></button>
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Gelişmiş Çapraz Virman Sihirbazı</h3>
              <p className="text-xs text-slate-400 font-medium">Bakiye dengelerini koruyarak hesaplar arası entegre transfer yapın.</p>
            </div>

            <form onSubmit={handleTransferKaydet} className="space-y-4">
              
              {/* Transfer Tipi Seçimi */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Transfer Mekanizması</label>
                <select value={transferForm.transfer_tipi} className="w-full p-3.5 rounded-xl bg-slate-50 font-bold text-xs mt-1 outline-none border-2 border-transparent focus:border-slate-200 cursor-pointer" 
                  onChange={(e) => setTransferForm({ ...transferForm, transfer_tipi: e.target.value, kaynak_uye_id:"", hedef_uye_id:"", kaynak_cari_id:"", hedef_cari_id:"" })}>
                  <option value="uye_to_uye_borc">👥 Üyeden Üyeye (Borç Devri)</option>
                  <option value="uye_to_uye_alacak">👥 Üyeden Üyeye (Alacak/Fazla Ödeme Devri)</option>
                  <option value="kasa_to_uye">🏢 Kasadan Üyeye Nakit Transferi</option>
                  <option value="uye_to_cari">🔄 Üyeden Cariye Mahsup İşlemi</option>
                  <option value="cari_to_uye">🔄 Cariden Üyeye Mahsup İşlemi</option>
                </select>
              </div>

              {/* DİNAMİK ALANLAR (SEÇİLEN MODEL KARTINA GÖRE GÖZÜKÜR) */}
              
              {/* Senaryo A: Üyeden Üyeye (Borç veya Alacak Devri) */}
              {(transferForm.transfer_tipi === "uye_to_uye_borc" || transferForm.transfer_tipi === "uye_to_uye_alacak") && (
                <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Kaynak Üye (Devreden)</label>
                    <input type="text" placeholder="Üye ara..." value={kaynakUyeSearch} onChange={(e)=>setKaynakUyeSearch(e.target.value)} className="w-full p-2.5 bg-white rounded-xl text-xs font-bold border border-slate-200 outline-none"/>
                    {kaynakUyeSearch && (
                      <div className="bg-white border border-slate-100 rounded-lg max-h-28 overflow-y-auto p-1 shadow-md space-y-0.5">
                        {filteredKaynakUyeler.map(u => (
                          <button key={u.id} type="button" onClick={() => { setTransferForm({...transferForm, kaynak_uye_id: u.id}); setKaynakUyeSearch(u.ad); }} className="w-full text-left p-1.5 hover:bg-slate-50 rounded-md text-xs font-bold text-slate-700 cursor-pointer">{u.ad}</button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Hedef Üye (Devralan)</label>
                    <input type="text" placeholder="Üye ara..." value={hedefUyeSearch} onChange={(e)=>setHedefUyeSearch(e.target.value)} className="w-full p-2.5 bg-white rounded-xl text-xs font-bold border border-slate-200 outline-none"/>
                    {hedefUyeSearch && (
                      <div className="bg-white border border-slate-100 rounded-lg max-h-28 overflow-y-auto p-1 shadow-md space-y-0.5">
                        {filteredHedefUyeler.map(u => (
                          <button key={u.id} type="button" onClick={() => { setTransferForm({...transferForm, hedef_uye_id: u.id}); setHedefUyeSearch(u.ad); }} className="w-full text-left p-1.5 hover:bg-slate-50 rounded-md text-xs font-bold text-slate-700 cursor-pointer">{u.ad}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Senaryo B: Kasadan Üyeye Nakit Çıkışı */}
              {transferForm.transfer_tipi === "kasa_to_uye" && (
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-2">
                  <div className="text-[11px] font-black text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-100">
                    💡 Bilgi: Bu işlem kasa mevcut bakiyesini azaltır ve seçilen hedef üyeyi kuruma borçlandırır.
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Hedef Üye (Parayı Alan)</label>
                    <input type="text" placeholder="Üye ara..." value={hedefUyeSearch} onChange={(e)=>setHedefUyeSearch(e.target.value)} className="w-full p-3 bg-white rounded-xl text-xs font-bold border border-slate-200 outline-none"/>
                    {hedefUyeSearch && (
                      <div className="bg-white border border-slate-100 rounded-lg max-h-28 overflow-y-auto p-1 shadow-md space-y-0.5">
                        {filteredHedefUyeler.map(u => (
                          <button key={u.id} type="button" onClick={() => { setTransferForm({...transferForm, hedef_uye_id: u.id}); setHedefUyeSearch(u.ad); }} className="w-full text-left p-1.5 hover:bg-slate-50 rounded-md text-xs font-bold text-slate-700 cursor-pointer">{u.ad}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Senaryo C: Üyeden Cariye Mahsup */}
              {transferForm.transfer_tipi === "uye_to_cari" && (
                <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Kaynak Üye (Ödeyen)</label>
                    <input type="text" placeholder="Üye ara..." value={kaynakUyeSearch} onChange={(e)=>setKaynakUyeSearch(e.target.value)} className="w-full p-2.5 bg-white rounded-xl text-xs font-bold border border-slate-200 outline-none"/>
                    {kaynakUyeSearch && (
                      <div className="bg-white border border-slate-100 rounded-lg max-h-28 overflow-y-auto p-1 shadow-md space-y-0.5">
                        {filteredKaynakUyeler.map(u => (
                          <button key={u.id} type="button" onClick={() => { setTransferForm({...transferForm, kaynak_uye_id: u.id}); setKaynakUyeSearch(u.ad); }} className="w-full text-left p-1.5 hover:bg-slate-50 rounded-md text-xs font-bold text-slate-700 cursor-pointer">{u.ad}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Hedef Cari (Alacaklı Esnaf)</label>
                    <input type="text" placeholder="Cari ara..." value={cariSearch} onChange={(e)=>setCariSearch(e.target.value)} className="w-full p-2.5 bg-white rounded-xl text-xs font-bold border border-slate-200 outline-none"/>
                    {cariSearch && (
                      <div className="bg-white border border-slate-100 rounded-lg max-h-28 overflow-y-auto p-1 shadow-md space-y-0.5">
                        {filteredCariler.map(c => (
                          <button key={c.id} type="button" onClick={() => { setTransferForm({...transferForm, hedef_cari_id: c.id}); setCariSearch(c.cari_ad); }} className="w-full text-left p-1.5 hover:bg-slate-50 rounded-md text-xs font-bold text-slate-700 cursor-pointer">{c.cari_ad}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Senaryo D: Cariden Üyeye Mahsup */}
              {transferForm.transfer_tipi === "cari_to_uye" && (
                <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Kaynak Cari (Esnaf)</label>
                    <input type="text" placeholder="Cari ara..." value={cariSearch} onChange={(e)=>setCariSearch(e.target.value)} className="w-full p-2.5 bg-white rounded-xl text-xs font-bold border border-slate-200 outline-none"/>
                    {cariSearch && (
                      <div className="bg-white border border-slate-100 rounded-lg max-h-28 overflow-y-auto p-1 shadow-md space-y-0.5">
                        {filteredCariler.map(c => (
                          <button key={c.id} type="button" onClick={() => { setTransferForm({...transferForm, kaynak_cari_id: c.id}); setCariSearch(c.cari_ad); }} className="w-full text-left p-1.5 hover:bg-slate-50 rounded-md text-xs font-bold text-slate-700 cursor-pointer">{c.cari_ad}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Hedef Üye (Yararlanan)</label>
                    <input type="text" placeholder="Üye ara..." value={hedefUyeSearch} onChange={(e)=>setHedefUyeSearch(e.target.value)} className="w-full p-2.5 bg-white rounded-xl text-xs font-bold border border-slate-200 outline-none"/>
                    {hedefUyeSearch && (
                      <div className="bg-white border border-slate-100 rounded-lg max-h-28 overflow-y-auto p-1 shadow-md space-y-0.5">
                        {filteredHedefUyeler.map(u => (
                          <button key={u.id} type="button" onClick={() => { setTransferForm({...transferForm, hedef_uye_id: u.id}); setHedefUyeSearch(u.ad); }} className="w-full text-left p-1.5 hover:bg-slate-50 rounded-md text-xs font-bold text-slate-700 cursor-pointer">{u.ad}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tutar ve Tarih Satırı */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">İşlem Tarihi</label>
                  <input required type="date" value={transferForm.tarih} className="w-full p-3.5 rounded-xl bg-slate-50 font-bold text-xs mt-1 border-none outline-none" onChange={(e)=>setTransferForm({...transferForm, tarih: e.target.value})}/>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Transfer Tutarı (TL)</label>
                  <input required type="number" step="0.01" placeholder="0.00" value={transferForm.tutar} className="w-full p-3.5 rounded-xl bg-slate-50 font-black text-xs mt-1 border-none outline-none" onChange={(e)=>setTransferForm({...transferForm, tutar: e.target.value})}/>
                </div>
              </div>

              {/* Gerekçe */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Virman Gerekçesi / Açıklama</label>
                <textarea required placeholder="Transfer/Mahsup nedenini detaylıca belirtiniz..." value={transferForm.aciklama} className="w-full p-3.5 rounded-xl bg-slate-50 font-bold h-20 text-xs mt-1 border-none outline-none resize-none" onChange={(e)=>setTransferForm({...transferForm, aciklama: e.target.value})}/>
              </div>

              <button type="submit" className="w-full bg-amber-600 text-white p-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:bg-amber-700 transition-all cursor-pointer">
                VİRMAN SÜRECİNİ BAŞLAT
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}