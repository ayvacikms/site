"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import { 
  Printer, CreditCard, X, QrCode, Copy, CheckCircle2, 
  ListFilter, CheckCircle, Download, Camera, User, Phone, Mail, Loader2,
  Megaphone, Bell, Calendar, ShieldCheck, LogOut
} from "lucide-react";
import Link from "next/link";

export default function UyePaneli() {
  const [loading, setLoading] = useState(true);
  const [profil, setProfil] = useState<any>(null);
  const [borclar, setBorclar] = useState<any[]>([]);
  const [odemeler, setOdemeler] = useState<any[]>([]);
  const [duyurular, setDuyurular] = useState<any[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [bankaBilgileri, setBankaBilgileri] = useState({
    banka_adi: "",
    hesap_sahibi: "",
    iban: ""
  });

  const [formData, setFormData] = useState({ ad: "", telefon: "" });

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

      const bugun = new Date();
      const buAyinSonu = new Date(bugun.getFullYear(), bugun.getMonth() + 1, 0).toISOString().split('T')[0];

      const [borcRes, odemeRes, duyuruRes, ayarRes] = await Promise.all([
        supabase.from("gider_uyeler").select("*, giderler(baslik)").eq("uye_id", uyeData.id).lte("borc_tarih", buAyinSonu).order('borc_tarih', { ascending: true }),
        supabase.from("odemeler").select("*").eq("uye_id", uyeData.id).order('odeme_tarihi', { ascending: false }),
        supabase.from("duyurular").select("*").eq("aktif_mi", true).order("olusturulma_tarihi", { ascending: false }).limit(3),
        supabase.from("site_ayarlari").select("*").single()
      ]);

      setBorclar(borcRes.data || []);
      setOdemeler(odemeRes.data || []);
      setDuyurular(duyuruRes.data || []);

      if (ayarRes.data) {
        setBankaBilgileri({
          banka_adi: ayarRes.data.banka_adi || "Belirtilmedi",
          hesap_sahibi: ayarRes.data.hesap_sahibi || "Belirtilmedi",
          iban: ayarRes.data.iban || "TR00..."
        });
      }
    } catch (error) {
      console.error("Veri hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  const profilGuncelle = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateLoading(true);
    try {
      const { error } = await supabase.from("uyeler").update({ ad: formData.ad, telefon: formData.telefon }).eq("id", profil.id);
      if (error) throw error;
      setProfil({ ...profil, ...formData });
      setIsProfileModalOpen(false);
    } catch (err: any) {
      alert("Hata: " + err.message);
    } finally {
      setUpdateLoading(false);
    }
  };

  const hesaplananTablo = useMemo(() => {
    let toplamOdemeHavuzu = odemeler.reduce((acc, curr) => acc + Number(curr.tutar), 0);
    const toplamBorcYukumlulugu = borclar.reduce((acc, curr) => acc + Number(curr.borc_tutari), 0);
    
    const islenmisBorclar = borclar.map((borc) => {
      const tutar = Number(borc.borc_tutari);
      let kalan = 0, durum = "";
      if (toplamOdemeHavuzu >= tutar) { kalan = 0; toplamOdemeHavuzu -= tutar; durum = "ÖDENDİ"; }
      else if (toplamOdemeHavuzu > 0) { kalan = tutar - toplamOdemeHavuzu; toplamOdemeHavuzu = 0; durum = "KISMİ"; }
      else { kalan = tutar; durum = "BEKLİYOR"; }
      return { ...borc, dKalan: kalan, dDurum: durum };
    });

    return { 
      borcListesi: [...islenmisBorclar].reverse(), 
      bakiye: toplamBorcYukumlulugu - odemeler.reduce((a,b)=>a+Number(b.tutar), 0)
    };
  }, [borclar, odemeler]);

  const excelIndir = () => {
    const ws = XLSX.utils.json_to_sheet(borclar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ekstre");
    XLSX.writeFile(wb, "Ekstre.xlsx");
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F7F9]">
      <Loader2 className="animate-spin text-[#4FBCA1]" size={48} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F7F9] text-[#4E5E6A] pb-32">
      
      {/* ÜST NAVİGASYON */}
      <nav className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1500px] mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsProfileModalOpen(true)} className="flex items-center gap-3 group transition-all">
              <div className="w-10 h-10 bg-[#4FBCA1] rounded-2xl flex items-center justify-center text-white font-bold shadow-lg group-hover:scale-105 transition-transform">
                {profil?.ad?.[0]}
              </div>
              <div className="text-left hidden sm:block">
                <h1 className="text-xs font-black text-[#2C3E50] uppercase tracking-tight">{profil?.ad}</h1>
                <p className="text-[9px] text-[#4FBCA1] font-bold uppercase tracking-widest">Üye Paneli</p>
              </div>
            </button>
            
            {(profil?.rol === 'admin' || profil?.eposta === 'glrmetin@gmail.com') && (
              <Link href="/admin/uyeler" className="bg-indigo-50 text-indigo-600 p-2 md:px-4 md:py-2 rounded-xl text-[10px] font-black border border-indigo-100 flex items-center gap-2 hover:bg-indigo-600 hover:text-white transition-all">
                <ShieldCheck size={16} />
                <span className="hidden md:inline">YÖNETİM</span>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex gap-2 mr-4">
              <button onClick={excelIndir} className="p-2.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-colors">
                <Download size={18}/>
              </button>
              <button onClick={() => window.print()} className="p-2.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-colors">
                <Printer size={18}/>
              </button>
            </div>
            <button 
              onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }}
              className="p-2.5 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      <main className="p-4 md:p-8 max-w-[1500px] mx-auto space-y-8">
        
        {/* ÖZET KARTLAR */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-white p-6 rounded-[32px] border-b-4 border-rose-400 shadow-sm transition-transform hover:scale-[1.02]">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Toplam Borç</p>
            <p className="text-2xl font-black text-slate-800">{borclar.reduce((a,b)=>a+Number(b.borc_tutari),0).toLocaleString('tr-TR')}₺</p>
          </div>
          <div className="bg-white p-6 rounded-[32px] border-b-4 border-teal-400 shadow-sm transition-transform hover:scale-[1.02]">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Toplam Ödeme</p>
            <p className="text-2xl font-black text-slate-800">{odemeler.reduce((a,b)=>a+Number(b.tutar),0).toLocaleString('tr-TR')}₺</p>
          </div>
          <div className="bg-[#2C3E50] p-6 rounded-[32px] shadow-xl text-white sm:col-span-2 lg:col-span-1">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Güncel Bakiye</p>
            <p className="text-2xl font-black">
              {hesaplananTablo.bakiye > 0 
                ? `${hesaplananTablo.bakiye.toLocaleString('tr-TR')}₺ BORÇ` 
                : `${Math.abs(hesaplananTablo.bakiye).toLocaleString('tr-TR')}₺ KREDİ`}
            </p>
          </div>
        </div>

        {/* DUYURULAR (SADECE VARSA) */}
        {duyurular.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 ml-2">
              <Megaphone size={18} className="text-[#4FBCA1]" />
              <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-tighter">Yönetimden Duyurular</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {duyurular.map((duyuru) => (
                <div key={duyuru.id} className="bg-white p-5 rounded-[24px] border-l-4 border-[#4FBCA1] shadow-sm relative overflow-hidden group">
                   <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-slate-400 uppercase">
                      <Calendar size={12} /> {new Date(duyuru.olusturulma_tarihi).toLocaleDateString('tr-TR')}
                   </div>
                   <h4 className="font-black text-slate-800 uppercase text-xs mb-1">{duyuru.baslik}</h4>
                   <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{duyuru.icerik}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TABLOLAR - MOBİL UYUMLU */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* BORÇLAR */}
          <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 bg-rose-50/30 border-b border-rose-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListFilter size={18} className="text-rose-500" />
                  <h3 className="text-[11px] font-black text-rose-700 uppercase">BORÇ LİSTESİ</h3>
                </div>
                <span className="text-[10px] font-bold text-rose-400 uppercase px-2 py-1 bg-rose-50 rounded-lg">FIFO</span>
            </div>
            
            {/* Masaüstü Tablo */}
            <div className="hidden md:block">
              <table className="w-full text-[11px] text-left">
                <thead className="bg-slate-50/50 text-gray-400 font-bold uppercase text-[10px]">
                  <tr><th className="p-5">VADE</th><th>AÇIKLAMA</th><th className="text-right">TUTAR</th><th className="p-5 text-right">DURUM</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {hesaplananTablo.borcListesi.map((b, i) => (
                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-5 text-gray-400">{new Date(b.borc_tarih).toLocaleDateString('tr-TR')}</td>
                      <td className="font-bold text-gray-700 uppercase">{b.giderler?.baslik}</td>
                      <td className="text-right text-gray-400">{b.borc_tutari}₺</td>
                      <td className="p-5 text-right font-black">
                        {b.dDurum === "ÖDENDİ" ? (
                          <span className="text-teal-500 bg-teal-50 px-2 py-1 rounded-lg text-[9px]">ÖDENDİ</span>
                        ) : (
                          <span className="text-rose-500 bg-rose-50 px-2 py-1 rounded-lg text-[9px]">{b.dKalan}₺ KALDI</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobil Liste */}
            <div className="md:hidden divide-y divide-gray-50">
              {hesaplananTablo.borcListesi.map((b, i) => (
                <div key={i} className="p-5 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-gray-400 mb-1">{new Date(b.borc_tarih).toLocaleDateString('tr-TR')}</p>
                    <p className="font-black text-slate-700 uppercase text-xs">{b.giderler?.baslik}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-800">{b.borc_tutari}₺</p>
                    <p className={`text-[9px] font-bold uppercase mt-1 ${b.dDurum === 'ÖDENDİ' ? 'text-teal-500' : 'text-rose-500'}`}>
                      {b.dDurum === 'ÖDENDİ' ? 'ÖDENDİ' : `${b.dKalan}₺ KALAN`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ÖDEMELER */}
          <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 bg-teal-50/30 border-b border-teal-100 flex items-center gap-2">
                <CheckCircle size={18} className="text-teal-500" />
                <h3 className="text-[11px] font-black text-teal-700 uppercase tracking-tight">SON ÖDEMELER</h3>
            </div>
            
            <div className="divide-y divide-gray-50">
              {odemeler.map((o, i) => (
                <div key={i} className="p-5 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-teal-50 rounded-full flex items-center justify-center text-teal-500">
                      <CreditCard size={14} />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 mb-1">{new Date(o.odeme_tarihi).toLocaleDateString('tr-TR')}</p>
                      <p className="font-black text-slate-700 uppercase text-xs">{o.odeme_yontemi || 'BANKA TRANSFERİ'}</p>
                    </div>
                  </div>
                  <p className="text-sm font-black text-teal-600">+{o.tutar}₺</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* MOBİL ALT AKSİYON BUTONU */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#F4F7F9] via-[#F4F7F9]/80 to-transparent md:bg-none pointer-events-none">
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="w-full md:w-auto md:fixed md:bottom-10 md:right-10 bg-[#4FBCA1] text-white flex items-center justify-center gap-3 px-8 py-5 rounded-[24px] shadow-2xl hover:scale-105 transition-all pointer-events-auto group"
        >
          <QrCode size={24} className="group-hover:rotate-12 transition-transform" /> 
          <span className="font-black text-xs uppercase tracking-[0.2em]">Hemen Ödeme Yap</span>
        </button>
      </div>

      {/* PROFİL MODALI */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl relative">
            <div className="bg-[#2C3E50] p-10 text-white text-center relative">
                <button onClick={() => setIsProfileModalOpen(false)} className="absolute top-6 right-6 text-white/30 hover:text-white"><X size={24}/></button>
                <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                  <User size={40} className="text-[#4FBCA1]" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest">Profil Ayarlarım</h3>
            </div>
            <form onSubmit={profilGuncelle} className="p-8 space-y-4">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Ad Soyad</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input type="text" value={formData.ad} onChange={(e)=>setFormData({...formData, ad: e.target.value})} className="w-full bg-slate-50 rounded-[20px] py-4 pl-12 font-bold text-sm outline-none focus:ring-2 focus:ring-[#4FBCA1] transition-all" />
                </div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">İletişim No</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input type="text" value={formData.telefon} onChange={(e)=>setFormData({...formData, telefon: e.target.value})} className="w-full bg-slate-50 rounded-[20px] py-4 pl-12 font-bold text-sm outline-none focus:ring-2 focus:ring-[#4FBCA1] transition-all" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={updateLoading} className="w-full py-4 rounded-[20px] font-black text-xs uppercase bg-[#4FBCA1] text-white shadow-lg flex items-center justify-center gap-2 hover:bg-[#3ea88d] transition-all">
                  {updateLoading ? <Loader2 className="animate-spin" size={16} /> : "Değişiklikleri Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ÖDEME MODALI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[48px] overflow-hidden shadow-2xl relative border border-white/20">
            <div className="bg-[#4FBCA1] p-12 text-white text-center relative overflow-hidden">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors z-10">
                <X size={28}/>
              </button>
              <div className="bg-white/20 w-20 h-20 rounded-[32px] flex items-center justify-center mx-auto mb-6 relative z-10 backdrop-blur-sm border border-white/30">
                <QrCode size={40} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight relative z-10">ÖDEME BİLGİLERİ</h3>
              <p className="text-[10px] text-white/70 font-bold mt-2 uppercase tracking-[0.2em] relative z-10">{bankaBilgileri.banka_adi}</p>
            </div>

            <div className="p-10 space-y-5 bg-white">
              <div className="p-5 bg-slate-50 rounded-[24px] border border-slate-100 group transition-all hover:bg-slate-100/50">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Hesap Sahibi</p>
                <p className="text-sm font-black text-slate-800 uppercase">{bankaBilgileri.hesap_sahibi}</p>
              </div>

              <div className="p-5 bg-slate-50 rounded-[24px] border border-slate-100 relative group transition-all hover:bg-slate-100/50">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">IBAN NUMARASI</p>
                <div className="flex justify-between items-center">
                  <span className="text-[13px] font-mono font-bold text-slate-700 tracking-tighter">{bankaBilgileri.iban}</span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(bankaBilgileri.iban);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }} 
                    className="text-[#4FBCA1] p-2 hover:bg-white rounded-xl shadow-sm transition-all"
                  >
                    {copied ? <CheckCircle2 size={22} className="text-teal-500" /> : <Copy size={22}/>}
                  </button>
                </div>
              </div>

              <div className="p-5 bg-rose-50 rounded-[24px] border border-rose-100">
                <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Havale Açıklaması (Önemli)</p>
                <p className="text-xs font-black text-rose-700 uppercase tracking-tight">
                  {profil?.ad} - AİDAT ÖDEMESİ
                </p>
              </div>

              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-full bg-[#2C3E50] text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-[#1a252f] transition-all active:scale-95"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}