"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import { 
  Printer, CreditCard, X, QrCode, Copy, CheckCircle2, 
  ListFilter, CheckCircle, Download, Camera, User, Phone, Mail, Loader2,
  Megaphone, Bell, Calendar
} from "lucide-react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";



export default function UyePaneli() {
  const [loading, setLoading] = useState(true);
  const [profil, setProfil] = useState<any>(null);
  const [borclar, setBorclar] = useState<any[]>([]);
  const [odemeler, setOdemeler] = useState<any[]>([]);
  const [duyurular, setDuyurular] = useState<any[]>([]);
  
  // Modallar
  const [isModalOpen, setIsModalOpen] = useState(false); // Ödeme Modalı
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false); // Profil Modalı
  const [updateLoading, setUpdateLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [bankaBilgileri, setBankaBilgileri] = useState({
    banka_adi: "",
    hesap_sahibi: "",
    iban: ""
  });

  // Form State
  const [formData, setFormData] = useState({ ad: "", telefon: "" });

  const BANKA_BILGILERI = {
    banka: "Ziraat Bankası",
    alici: "ÖMÜR KARACA - İDA KONAKLARI",
    iban: "TR00 0000 0000 0000 0000 0000 00",
    aciklama: `${profil?.ad || ''} - Aidat`
  };

  useEffect(() => { verileriGetir(); }, []);

  const verileriGetir = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: uyeData } = await supabase.from("uyeler").select("*").eq("auth_id", user.id).single();
      if (!uyeData) return;
      setProfil(uyeData);

      setFormData({ ad: uyeData.ad || "", telefon: uyeData.telefon || "" });

      const [borcRes, odemeRes, duyuruRes, ayarRes] = await Promise.all([
        supabase.from("gider_uyeler").select("*, giderler(baslik)").eq("uye_id", uyeData.id).lte("borc_tarih", "2026-05-10").order('borc_tarih', { ascending: true }),
        supabase.from("odemeler").select("*").eq("uye_id", uyeData.id).order('odeme_tarihi', { ascending: false }),
        supabase.from("duyurular").select("*").eq("aktif_mi", true).order("olusturulma_tarihi", { ascending: false }).limit(3),
        supabase.from("site_ayarlari").select("*").single() // Ayarlar tablosundan banka bilgilerini al
      ]);

      setBorclar(borcRes.data || []);
      setOdemeler(odemeRes.data || []);
      setDuyurular(duyuruRes.data || []);

      if (ayarRes.data) {
        setBankaBilgileri({
          banka_adi: ayarRes.data.banka_adi || "Yönetici Tarafından Belirtilmedi",
          hesap_sahibi: ayarRes.data.hesap_sahibi || "Yönetici Tarafından Belirtilmedi",
          iban: ayarRes.data.iban || "TR00..."
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // 1. GÜNCELLEME HATASI ÇÖZÜMÜ: Sadece değişen ve var olan sütunları gönderiyoruz
  const profilGuncelle = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateLoading(true);
    try {
      const { error } = await supabase
        .from("uyeler")
        .update({ 
          ad: formData.ad, 
          telefon: formData.telefon 
          // Hata almamak için avatar_url'i şimdilik çıkardım, 
          // tablo yapınızda kesin varsa ekleyebilirsiniz.
        })
        .eq("id", profil.id);
      
      if (error) throw error;
      
      setProfil({ ...profil, ...formData });
      setIsProfileModalOpen(false);
      alert("Profil güncellendi!");
    } catch (err: any) {
      console.error("Güncelleme Hatası:", err.message);
      alert("Hata: " + err.message);
    } finally {
      setUpdateLoading(false);
    }
  };

  // FIFO VE BAKİYE HESABI (Resim 2'deki Yapı)
  const hesaplananTablo = useMemo(() => {
    let toplamOdemeHavuzu = odemeler.reduce((acc, curr) => acc + Number(curr.tutar), 0);
    const toplamBorcYukumlulugu = borclar.reduce((acc, curr) => acc + Number(curr.borc_tutari), 0);
    
    const islenmisBorclar = borclar.map((borc) => {
      const tutar = Number(borc.borc_tutari);
      let kalan = 0, durum = "";

      if (toplamOdemeHavuzu >= tutar) {
        kalan = 0; toplamOdemeHavuzu -= tutar; durum = "ÖDENDİ";
      } else if (toplamOdemeHavuzu > 0) {
        kalan = tutar - toplamOdemeHavuzu; toplamOdemeHavuzu = 0; durum = "KISMİ";
      } else {
        kalan = tutar; durum = "BEKLİYOR";
      }
      return { ...borc, dKalan: kalan, dDurum: durum };
    });

    const netBakiye = toplamBorcYukumlulugu - odemeler.reduce((a,b)=>a+Number(b.tutar), 0);

    return { 
      borcListesi: [...islenmisBorclar].reverse(), 
      hamListe: islenmisBorclar,
      bakiye: netBakiye
    };
  }, [borclar, odemeler]);

  const excelIndir = () => {
    const veri = hesaplananTablo.hamListe.map(b => ({
      "Vade": new Date(b.borc_tarih).toLocaleDateString('tr-TR'),
      "Açıklama": b.giderler?.baslik,
      "Tutar": b.borc_tutari + " ₺",
      "Kalan": b.dKalan + " ₺",
      "Durum": b.dDurum
    }));
    const ws = XLSX.utils.json_to_sheet(veri);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ekstre");
    XLSX.writeFile(wb, `${profil?.ad}_Ekstre.xlsx`);
  };

  if (loading) return <div className="p-10 text-center font-bold">Yükleniyor...</div>;

  return (
    <div className="min-h-screen bg-[#F4F7F9] text-[#4E5E6A] pb-24">
      
      {/* ÜST PANEL (Resim 2) */}
{/* ÜST PANEL - PROFİL VE ADMİN KONTROLÜ */}
    <div className="bg-white border-b p-4 flex justify-between items-center px-8 shadow-sm">
      <div className="flex items-center gap-6"> {/* Aradaki boşluğu biraz açtık */}
        {/* PROFİL TIKLAMA ALANI */}
        <button 
          onClick={() => setIsProfileModalOpen(true)} 
          className="flex items-center gap-3 hover:opacity-80 transition-all text-left"
        >
          <div className="w-10 h-10 bg-[#4FBCA1] rounded-full flex items-center justify-center text-white font-bold uppercase shadow-sm">
            {profil?.ad?.[0]}
          </div>
          <div>
            <h1 className="text-sm font-black text-[#2C3E50] uppercase leading-none">{profil?.ad}</h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">GÜNCEL HESAP DURUMU</p>
          </div>
        </button>
        <button onClick={async () => {
                      await supabase.auth.signOut();
                      window.location.href = "/login";
                    }}
                    className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all shadow-sm uppercase tracking-tighter"
         >Çıkış</button>

        {/* ADMİN PANELİ BUTONU (SADECE ADMİNSE GÖRÜNÜR) */}
        {/* Not: Buradaki kontrolü profil?.rol === 'admin' veya e-posta üzerinden yapabilirsiniz */}
        {(profil?.rol === 'admin' || profil?.eposta === 'glrmetin@gmail.com') && (
          <Link 
            href="/admin/uyeler" 
            className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all shadow-sm uppercase tracking-tighter"
          >
            <ShieldCheck size={14} />
            Yönetim Paneline Git
          </Link>
          

          

        )}
      </div>




      <div className="flex gap-2 print:hidden">
          <button onClick={excelIndir} className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-lg text-[11px] font-bold hover:bg-slate-200 uppercase tracking-tighter">
              <Download size={14}/> EXCEL AKTAR
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-lg text-[11px] font-bold hover:bg-slate-200 uppercase tracking-tighter">
              <Printer size={14}/> PDF YAZDIR
          </button>
      </div>
    </div>

      <div className="p-8 max-w-[1500px] mx-auto">
        {/* ÖZET KARTLAR (Resim 2) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl border-b-4 border-rose-400 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Toplam Borçlanma</p>
            <p className="text-2xl font-black text-gray-700">{borclar.reduce((a,b)=>a+Number(b.borc_tutari),0).toLocaleString('tr-TR')}₺</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border-b-4 border-green-400 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Toplam Ödeme</p>
            <p className="text-2xl font-black text-gray-700">{odemeler.reduce((a,b)=>a+Number(b.tutar),0).toLocaleString('tr-TR')}₺</p>
          </div>
          <div className={`bg-white p-6 rounded-2xl border-b-4 shadow-sm ${hesaplananTablo.bakiye <= 0 ? 'border-teal-500' : 'border-[#4FBCA1]'}`}>
            <p className="text-[10px] font-black text-gray-400 uppercase mb-1 tracking-widest">Güncel Durum</p>
            <p className={`text-2xl font-black ${hesaplananTablo.bakiye <= 0 ? 'text-teal-600' : 'text-[#4FBCA1]'}`}>
              {hesaplananTablo.bakiye > 0 
                ? `${hesaplananTablo.bakiye.toLocaleString('tr-TR')}₺ (BORÇ)` 
                : `${Math.abs(hesaplananTablo.bakiye).toLocaleString('tr-TR')}₺ (KREDİ)`}
            </p>
          </div>
        </div>

        {/* TABLOLAR (Resim 2 Yan Yana) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* SOL: BORÇLAR */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 bg-rose-50/30 border-b border-rose-100 flex items-center gap-2">
                <ListFilter size={18} className="text-rose-500" />
                <h3 className="text-xs font-black text-rose-700 uppercase tracking-tight">GÜNÜ GELMİŞ BORÇLAR</h3>
            </div>
            <div className="p-2 overflow-x-auto">
              <table className="w-full text-[11px] text-left">
                <thead>
                  <tr className="text-gray-400 font-bold border-b text-[10px] uppercase">
                    <th className="p-4">VADE</th><th className="p-4">AÇIKLAMA</th><th className="p-4 text-right">TUTAR</th><th className="p-4 text-right">KALAN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {hesaplananTablo.borcListesi.map((b, i) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="p-4 text-gray-400">{new Date(b.borc_tarih).toLocaleDateString('tr-TR')}</td>
                      <td className="p-4 font-bold text-gray-700 uppercase">{b.giderler?.baslik}</td>
                      <td className="p-4 text-right text-gray-300">{b.borc_tutari}₺</td>
                      <td className="p-4 text-right font-black">
                        {b.dDurum === "ÖDENDİ" ? (
                          <span className="inline-flex items-center gap-1 text-teal-500 bg-teal-50 px-2 py-1 rounded-md text-[9px] font-black">
                            ÖDENDİ <CheckCircle size={12}/>
                          </span>
                        ) : (
                          <span className="text-rose-500">{b.dKalan}₺</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SAĞ: ÖDEMELER */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 bg-green-50/30 border-b border-green-100 flex items-center gap-2">
                <CheckCircle size={18} className="text-green-500" />
                <h3 className="text-xs font-black text-green-700 uppercase tracking-tight">ÖDEME GEÇMİŞİ</h3>
            </div>
            <div className="p-2 overflow-x-auto">
              <table className="w-full text-[11px] text-left">
                <thead>
                  <tr className="text-gray-400 font-bold border-b text-[10px] uppercase">
                    <th className="p-4">TARİH</th><th className="p-4">YÖNTEM</th><th className="p-4 text-right">TUTAR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {odemeler.map((o, i) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="p-4 text-gray-400">{new Date(o.odeme_tarihi).toLocaleDateString('tr-TR')}</td>
                      <td className="p-4 font-bold text-gray-700 uppercase">{o.odeme_yontemi || 'BANKA'}</td>
                      <td className="p-4 text-right font-black text-green-600">+{o.tutar}₺</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

{/* --- DUYURULAR BÖLÜMÜ (YENİ) --- */}
        {duyurular.length > 0 && (
          <div className="mb-10 animate-in slide-in-from-top duration-500">
            <div className="flex items-center gap-2 mb-4 ml-2">
              <Megaphone size={18} className="text-[#4FBCA1]" />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-tighter">Yönetimden Duyurular</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {duyurular.map((duyuru) => (
                <div key={duyuru.id} className="bg-white p-5 rounded-2xl border-l-4 border-l-[#4FBCA1] shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                   <div className="absolute top-[-10px] right-[-10px] text-[#4FBCA1]/5 group-hover:scale-110 transition-transform">
                      <Bell size={80} />
                   </div>
                   <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-slate-400 uppercase">
                      <Calendar size={12} />
                      {new Date(duyuru.olusturulma_tarihi).toLocaleDateString('tr-TR')}
                   </div>
                   <h4 className="font-black text-slate-800 uppercase text-sm mb-2">{duyuru.baslik}</h4>
                   <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{duyuru.icerik}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ÖDEME YAP BUTONU (Resim 2) */}
      <button onClick={() => setIsModalOpen(true)} className="fixed bottom-10 right-10 bg-[#4FBCA1] text-white flex items-center gap-3 px-8 py-5 rounded-3xl shadow-2xl hover:scale-105 transition-all z-40 group">
        <CreditCard size={24} /> <span className="font-black text-sm uppercase tracking-[0.1em]">Ödeme Yap</span>
      </button>

      {/* PROFİL MODALI (Resim 1) */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl relative">
            <div className="bg-[#2C3E50] p-8 text-white text-center">
                <button onClick={() => setIsProfileModalOpen(false)} className="absolute top-6 right-6 text-white/50 hover:text-white"><X size={24}/></button>
                <h3 className="text-lg font-black uppercase tracking-widest">Profil Ayarları</h3>
            </div>
            <form onSubmit={profilGuncelle} className="p-8 space-y-5">
              <div className="flex flex-col items-center mb-4">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 border-4 border-white shadow-md relative">
                    <User size={40} />
                    <div className="absolute bottom-0 right-0 bg-[#4FBCA1] p-1.5 rounded-full text-white"><Camera size={14}/></div>
                </div>
                <p className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-tighter">Resmi Değiştirmek İçin Tıkla</p>
              </div>
              <div className="space-y-3">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" value={formData.ad} onChange={(e)=>setFormData({...formData, ad: e.target.value})} className="w-full bg-slate-50 rounded-2xl py-4 pl-12 font-bold text-sm outline-none focus:ring-2 focus:ring-[#4FBCA1]" placeholder="Ad Soyad" />
                </div>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" value={formData.telefon} onChange={(e)=>setFormData({...formData, telefon: e.target.value})} className="w-full bg-slate-50 rounded-2xl py-4 pl-12 font-bold text-sm outline-none focus:ring-2 focus:ring-[#4FBCA1]" placeholder="Telefon" />
                </div>
                <div className="relative opacity-50">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" disabled value={profil?.email || ""} className="w-full bg-slate-100 rounded-2xl py-4 pl-12 font-bold text-sm" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsProfileModalOpen(false)} className="flex-1 py-4 rounded-2xl font-black text-[11px] uppercase bg-slate-100 text-slate-500">İptal</button>
                <button type="submit" disabled={updateLoading} className="flex-1 py-4 rounded-2xl font-black text-[11px] uppercase bg-[#4FBCA1] text-white shadow-lg flex items-center justify-center gap-2">
                  {updateLoading ? <Loader2 className="animate-spin" size={16} /> : "Güncelle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BANKA MODAL (Resim 1'deki Ödeme Bilgileri) */}
      {/* ÖDEME YAP MODALI (Geri Geldi ve Dinamik Oldu) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl relative border border-white/20">
            <div className="bg-[#4FBCA1] p-10 text-white text-center">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors">
                <X size={28}/>
              </button>
              <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <QrCode size={32} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight">BANKA BİLGİLERİ</h3>
              <p className="text-[10px] text-white/70 font-bold mt-1 uppercase tracking-widest">{bankaBilgileri.banka_adi}</p>
            </div>

            <div className="p-8 space-y-4 bg-white">
              {/* Hesap Sahibi */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hesap Sahibi</p>
                <p className="text-sm font-black text-slate-800 mt-1 uppercase">{bankaBilgileri.hesap_sahibi}</p>
              </div>

              {/* IBAN */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">IBAN NUMARASI</p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs font-mono font-bold text-slate-700 tracking-tighter">{bankaBilgileri.iban}</span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(bankaBilgileri.iban);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }} 
                    className="text-[#4FBCA1] p-2 hover:bg-[#4FBCA1]/10 rounded-lg transition-all"
                  >
                    {copied ? <CheckCircle2 size={20}/> : <Copy size={20}/>}
                  </button>
                </div>
              </div>

              {/* Açıklama Alanı (Otomatik Üye Adı Yazar) */}
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Transfer Açıklaması</p>
                <p className="text-xs font-black text-rose-700 italic mt-1 uppercase">
                  {profil?.ad} - AİDAT
                </p>
              </div>

              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-full bg-[#2C3E50] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:bg-[#1a252f] transition-all"
              >
                Anladım, Kapat
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
  
}