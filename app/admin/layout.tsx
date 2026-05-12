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
  UserCheck,
  Megaphone,
  CreditCard,
  Briefcase,
  History
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) { router.push("/login"); return; }

        const { data: uye, error: roleError } = await supabase
          .from("uyeler")
          .select("rol")
          .eq("auth_id", user.id)
          .single();

        if (roleError || uye?.rol !== "admin") { router.push("/uye-paneli"); return; }

        await fetchPendingCount();
        setIsLoading(false);
      } catch (error) {
        router.push("/login");
      }
    };
    checkAdmin();
  }, []);

  const fetchPendingCount = async () => {
    const { count } = await supabase
      .from("uyeler")
      .select("*", { count: 'exact', head: true })
      .eq("aktif_mi", false);
    if (count !== null) setPendingCount(count);
  };

  const menuItems = [
    { name: "Genel Bakış", href: "/admin", icon: LayoutDashboard },
    { name: "Üye Yönetimi", href: "/admin/uyeler", icon: Users },
    { 
      name: "Onay Bekleyenler", 
      href: "/admin/onay-bekleyenler", 
      icon: UserCheck,
      badge: pendingCount > 0 ? pendingCount : null 
    },
    { name: "Gider Tanımları", href: "/admin/giderler", icon: Briefcase },
    { name: "Borçlandırma", href: "/admin/borclar", icon: CreditCard },
    { name: "Kasa Hareketi", href: "/admin/kasa", icon: History },
    { name: "Cari Kayıtlar", href: "/admin/cariler", icon: Wallet },
    { name: "Duyuru Paneli", href: "/admin/duyuru", icon: Megaphone },
    { name: "Sistem Ayarları", href: "/admin/ayarlar", icon: Settings },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#1eb3a4] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-black text-xs uppercase tracking-widest animate-pulse">Sistem Hazırlanıyor...</p>
        </div>
      </div>
    );
  }

  const NavItem = ({ item, isMobile = false }: { item: any, isMobile?: boolean }) => {
    const isActive = pathname === item.href;
    return (
      <Link
        href={item.href}
        onClick={() => isMobile && setIsMobileMenuOpen(false)}
        className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 group relative
          ${isActive 
            ? "bg-[#1eb3a4] text-white shadow-lg shadow-teal-100" 
            : "text-slate-400 hover:bg-slate-800 hover:text-white"
          }`}
      >
        <item.icon size={20} className={isActive ? "text-white" : "group-hover:text-white transition-colors"} />
        {(isSidebarOpen || isMobile) && (
          <div className="flex items-center justify-between flex-1">
            <span className="font-bold text-[13px] tracking-tight">{item.name}</span>
            {item.badge && (
              <span className="bg-rose-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black animate-bounce">
                {item.badge}
              </span>
            )}
          </div>
        )}
        {!isSidebarOpen && !isMobile && item.badge && (
          <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#1E293B]"></span>
        )}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#f1f5f9]">
      {/* MASAÜSTÜ SIDEBAR */}
      <aside className={`hidden md:flex bg-[#1E293B] text-white transition-all duration-500 shadow-2xl z-50 
        ${isSidebarOpen ? "w-72" : "w-24"} flex-col fixed h-full`}>
        
        <div className="p-8 flex items-center justify-between">
          {isSidebarOpen ? (
            <div className="flex flex-col">
              <span className="font-black text-lg tracking-tighter text-[#1eb3a4] leading-none">AYVACIK</span>
              <span className="text-[10px] font-bold text-slate-500 tracking-[0.2em]">MOTOR SPORLARI</span>
            </div>
          ) : (
            <div className="w-10 h-10 bg-[#1eb3a4] rounded-xl flex items-center justify-center font-black">A</div>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
          {menuItems.map((item) => <NavItem key={item.href} item={item} />)}
        </nav>

        <div className="p-4 mt-auto border-t border-slate-800/50">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full py-3 flex items-center justify-center bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-all text-slate-400"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </aside>

      {/* MOBIL ALT MENÜ (Instagram Stili - Minimal) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 z-[100] px-6 py-3 flex justify-between items-center shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
          <Link href="/admin" className={pathname === "/admin" ? "text-[#1eb3a4]" : "text-slate-400"}><LayoutDashboard size={24}/></Link>
          <Link href="/admin/uyeler" className={pathname === "/admin/uyeler" ? "text-[#1eb3a4]" : "text-slate-400"}><Users size={24}/></Link>
          <button onClick={() => setIsMobileMenuOpen(true)} className="w-14 h-14 bg-[#1eb3a4] rounded-2xl flex items-center justify-center text-white -mt-10 shadow-xl shadow-teal-200 border-4 border-white active:scale-90 transition-all">
            <Menu size={28} />
          </button>
          <Link href="/admin/kasa" className={pathname === "/admin/kasa" ? "text-[#1eb3a4]" : "text-slate-400"}><History size={24}/></Link>
          <Link href="/admin/ayarlar" className={pathname === "/admin/ayarlar" ? "text-[#1eb3a4]" : "text-slate-400"}><Settings size={24}/></Link>
      </div>

      {/* MOBIL TAM EKRAN MENÜ */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-[#1E293B] z-[110] p-8 flex flex-col animate-in slide-in-from-bottom duration-500">
          <div className="flex justify-between items-center mb-10">
            <span className="font-black text-[#1eb3a4]">TÜM MENÜLER</span>
            <button onClick={() => setIsMobileMenuOpen(false)} className="bg-slate-800 p-3 rounded-full text-white"><X/></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {menuItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)} className="bg-slate-800/50 p-6 rounded-[25px] flex flex-col items-center gap-3 active:bg-[#1eb3a4] transition-colors group">
                <item.icon size={28} className="text-slate-400 group-active:text-white" />
                <span className="text-[10px] font-black text-white uppercase text-center leading-tight">{item.name}</span>
              </Link>
            ))}
          </div>
          <button 
            onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}
            className="mt-auto w-full py-5 bg-rose-500/10 text-rose-500 rounded-3xl font-black text-xs uppercase tracking-widest"
          >
            GÜVENLİ ÇIKIŞ YAP
          </button>
        </div>
      )}

      {/* ANA İÇERİK */}
      <main className={`flex-1 transition-all duration-500 ${isSidebarOpen ? "md:ml-72" : "md:ml-24"} pb-24 md:pb-8`}>
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-40">
          <div className="flex flex-col">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Yönetim Paneli</h2>
            <span className="text-lg font-black text-slate-800 capitalize tracking-tighter">
              {pathname.split('/').pop() === 'admin' ? 'Dashboard' : pathname.split('/').pop()?.replace('-', ' ')}
            </span>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <p className="text-[11px] font-black text-slate-700 leading-none uppercase">Admin Yetkisi</p>
              <p className="text-[9px] text-[#1eb3a4] font-bold mt-1 uppercase">Sistem Çevrimiçi</p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-[#1E293B] font-black border border-slate-200 shadow-sm">
              A
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}