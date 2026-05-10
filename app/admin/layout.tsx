"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Users, 
  LayoutDashboard, 
  Wallet, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  ChevronRight,
  Bell,
  UserCheck // Yeni ikon eklendi
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0); // Onay bekleyen sayısı
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        window.location.href = "/login";
      } else {
        setIsLoading(false);
        fetchPendingCount(); // Oturum varsa sayıyı getir
      }
    };
    checkAdmin();
    
    // Onay bekleyenleri gerçek zamanlı izlemek istersen bu fonksiyonu 
    // belli aralıklarla veya Supabase Realtime ile de bağlayabiliriz.
  }, []);

  // Onay bekleyen üye sayısını veritabanından çek
  const fetchPendingCount = async () => {
    const { count, error } = await supabase
      .from("uyeler")
      .select("*", { count: 'exact', head: true })
      .eq("aktif_mi", false);
    
    if (!error && count !== null) setPendingCount(count);
  };

  const menuItems = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { 
      name: "Üye Yönetimi", 
      href: "/admin/uyeler", 
      icon: Users 
    },
    { 
      name: "Onay Bekleyenler", 
      href: "/admin/onay-bekleyenler", 
      icon: UserCheck,
      badge: pendingCount > 0 ? pendingCount : null // Sayı varsa göster
    },
    { name: "Giderler & Aidat", href: "/admin/giderler", icon: Wallet },
    { name: "Ayarlar", href: "/admin/ayarlar", icon: Settings },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#4FBCA1] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-bold animate-pulse">Yönetici Yetkisi Kontrol Ediliyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* SIDEBAR */}
      <aside className={`bg-[#1E293B] text-white transition-all duration-300 shadow-xl z-50 
        ${isSidebarOpen ? "w-72" : "w-20"} flex flex-col fixed h-full`}>
        
        <div className="p-6 flex items-center justify-between border-b border-slate-700/50">
          {isSidebarOpen && (
            <span className="font-black text-xl tracking-tighter text-[#4FBCA1]">İDA KONAKLARI</span>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group relative
                  ${isActive 
                    ? "bg-[#4FBCA1] text-white shadow-lg shadow-[#4FBCA1]/20" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
              >
                <item.icon size={22} className={isActive ? "text-white" : "group-hover:text-white"} />
                {isSidebarOpen && (
                  <div className="flex items-center justify-between flex-1">
                    <span className="font-bold text-sm">{item.name}</span>
                    <div className="flex items-center gap-2">
                      {item.badge && (
                        <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">
                          {item.badge}
                        </span>
                      )}
                      {isActive && <ChevronRight size={14} />}
                    </div>
                  </div>
                )}
                {/* Sidebar kapalıyken rozeti ikonun üstünde küçük nokta olarak göster */}
                {!isSidebarOpen && item.badge && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border border-[#1E293B]"></span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700/50">
          <button 
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
            className="flex items-center gap-4 px-4 py-3 w-full text-left text-slate-400 hover:text-white transition-colors"
          >
            <LogOut size={20} />
            {isSidebarOpen && <span className="text-xs font-bold uppercase tracking-widest">Güvenli Çıkış</span>}
          </button>
        </div>
      </aside>

      {/* ANA İÇERİK ALANI */}
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? "ml-72" : "ml-20"}`}>
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium capitalize">
                {pathname.split('/').pop() === 'admin' ? 'Dashboard' : pathname.split('/').pop()?.replace('-', ' ')}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-[#4FBCA1] relative">
              <Bell size={20} />
              {pendingCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
              )}
            </button>
            <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <p className="text-sm font-black text-slate-700 leading-none uppercase">Admin Panel</p>
                <p className="text-[10px] text-slate-400 font-bold mt-1">Yönetici Yetkisi</p>
              </div>
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-[#2C3E50] font-bold border border-slate-200 uppercase">
                A
              </div>
            </div>
          </div>
        </header>

        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}