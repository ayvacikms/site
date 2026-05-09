"use client"; // En üstte olduğundan emin ol

import { useState } from "react";
import { supabase } from "@/lib/supabase"; // Yolun doğru olduğundan emin ol

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adSoyad, setAdSoyad] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Supabase Auth ile kullanıcıyı oluştur
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password 
    });

    if (error) {
      alert("Hata: " + error.message);
      return;
    }

    if (data.user) {
      // 2. Uyeler tablosuna ekle
      const { error: dbError } = await supabase.from("uyeler").insert([
        {
          ad: adSoyad,
          eposta: email,
          aktif_mi: false,
          uyelik_baslangic: new Date().toISOString(),
        },
      ]);

      if (dbError) {
        alert("Veritabanı hatası: " + dbError.message);
      } else {
        alert("Kayıt başarılı! Yöneticiniz onayladığında giriş yapabileceksiniz.");
      }
    }
  };

  return (
    // Form içeriğin buraya gelecek...
    <div>Register Formu</div>
  );
}