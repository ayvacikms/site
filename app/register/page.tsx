const handleRegister = async (e: any) => {
  e.preventDefault();
  // 1. Supabase Auth ile kullanıcıyı oluştur
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (!error) {
    // 2. Uyeler tablosuna 'bekliyor' durumunda ekle
    await supabase.from("uyeler").insert([{
      ad: adSoyad,
      eposta: email,
      aktif_mi: false, // KRİTİK: Admin onaylayana kadar kapalı
      uyelik_baslangic: new Date().toISOString()
    }]);
    alert("Kayıt başarılı! Yöneticiniz onayladığında giriş yapabileceksiniz.");
  }
}