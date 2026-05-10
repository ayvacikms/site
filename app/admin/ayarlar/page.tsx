"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Save, Globe, Phone, Mail, MapPin, Share2, Loader2 } from "lucide-react";

export default function AyarlarPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    site_adi: "",
    telefon: "",
    eposta: "",
    adres: "",
    instagram_url: "",
    facebook_url: "",
    twitter_url: "",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

const fetchSettings = async () => {
  try {
    const { data, error } = await supabase
      .from("site_ayarlari")
      .select("*")
      .eq("id", 1)
      .single();

    if (data) {
      // Veritabanından gelen null değerleri boş stringe çeviriyoruz
      setSettings({
        site_adi: data.site_adi || "",
        telefon: data.telefon || "",
        eposta: data.eposta || "",
        adres: data.adres || "",
        instagram_url: data.instagram_url || "",
        facebook_url: data.facebook_url || "",
        twitter_url: data.twitter_url || "",
      });
    }
  } catch (error) {
    console.error("Ayarlar yüklenirken hata:", error);
  } finally {
    setLoading(false);
  }
};

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const { error } = await supabase
      .from("site_ayarlari")
      .upsert({ id: 1, ...settings, updated_at: new Date().toISOString() });

    if (error) {
      alert("Hata oluştu: " + error.message);
    } else {
      alert("Ayarlar başarıyla güncellendi!");
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[#4FBCA1]" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Site Yönetimi</h1>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#4FBCA1] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#3da88d] transition-all shadow-lg shadow-[#4FBCA1]/20 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={18} />}
          Değişiklikleri Kaydet
        </button>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Genel Bilgiler */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-[#4FBCA1] font-bold border-b pb-3 mb-4">
            <Globe size={20} />
            <span>Genel Bilgiler</span>
          </div>
          
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Site Adı</label>
            <input 
              type="text" 
              value={settings.site_adi}
              onChange={(e) => setSettings({...settings, site_adi: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4FBCA1] outline-none transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block italic text-[#4FBCA1]">İletişim Telefonu</label>
            <div className="relative">
              <Phone size={16} className="absolute left-4 top-3.5 text-slate-400" />
              <input 
                type="text" 
                value={settings.telefon}
                onChange={(e) => setSettings({...settings, telefon: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 focus:ring-2 focus:ring-[#4FBCA1] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">E-Posta Adresi</label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-3.5 text-slate-400" />
              <input 
                type="email" 
                value={settings.eposta}
                onChange={(e) => setSettings({...settings, eposta: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 focus:ring-2 focus:ring-[#4FBCA1] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Sosyal Medya */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-[#4FBCA1] font-bold border-b pb-3 mb-4">
            <Share2 size={20} />
            <span>Sosyal Medya Linkleri</span>
          </div>
          
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Instagram</label>
            <input 
              type="text" 
              placeholder="https://instagram.com/..."
              value={settings.instagram_url}
              onChange={(e) => setSettings({...settings, instagram_url: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4FBCA1] outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Facebook</label>
            <input 
              type="text" 
              placeholder="https://facebook.com/..."
              value={settings.facebook_url}
              onChange={(e) => setSettings({...settings, facebook_url: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4FBCA1] outline-none"
            />
          </div>
          <div>
  <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Site Logosu (URL)</label>
  <input 
    type="text" 
    placeholder="https://.../logo.png"
    value={settings.logo_url}
    onChange={(e) => setSettings({...settings, logo_url: e.target.value})}
    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4FBCA1] outline-none"
  />
</div>
        </div>

        {/* Adres Bilgisi (Full Width) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm md:col-span-2">
          <div className="flex items-center gap-2 text-[#4FBCA1] font-bold border-b pb-3 mb-4">
            <MapPin size={20} />
            <span>Adres Bilgileri</span>
          </div>
          <textarea 
            rows={3}
            value={settings.adres}
            onChange={(e) => setSettings({...settings, adres: e.target.value})}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#4FBCA1] outline-none transition-all"
            placeholder="Açık adres bilgilerini buraya yazın..."
          />
        </div>
      </form>
    </div>
  );
}