"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

type Borc = {
  id: string;
  gider_id: string;
  uye_id: string;
  borc_tutari: number;
  borc_tarih: string;
  odendi: boolean;
  gider?: { baslik: string };
  uye?: { ad: string };
};

export default function BorclarPage() {
  const [borclar, setBorclar] = useState<Borc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBorclar = async () => {
      const { data, error } = await supabase
        .from("gider_uyeler")
        .select("id, gider_id, uye_id, borc_tutari, borc_tarih, odendi, gider: giderler(baslik), uye: uyeler(ad)")
        .order("borc_tarih", { ascending: false });

      if (error) {
        console.error("Borçları çekerken hata:", error.message);
      } else {
        setBorclar(data || []);
      }
      setLoading(false);
    };
    fetchBorclar();
  }, []);

  const toggleOdeme = async (borc: Borc) => {
    const { error } = await supabase
      .from("gider_uyeler")
      .update({ odendi: !borc.odendi })
      .eq("id", borc.id);

    if (error) {
      console.error("Ödeme güncelleme hatası:", error.message);
    } else {
      setBorclar((prev) =>
        prev.map((b) => (b.id === borc.id ? { ...b, odendi: !borc.odendi } : b))
      );
    }
  };

  if (loading) return <p>Yükleniyor...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Borçlar</h1>
      <table className="table-auto w-full border-collapse shadow rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-blue-600 text-white">
            <th className="p-3 text-left">Üye</th>
            <th className="p-3 text-left">Gider</th>
            <th className="p-3 text-left">Tutar</th>
            <th className="p-3 text-left">Tarih</th>
            <th className="p-3 text-center">Durum</th>
          </tr>
        </thead>
        <tbody>
          {borclar.map((borc) => (
            <tr key={borc.id} className="hover:bg-gray-100 transition">
              <td className="p-3">{borc.uye?.ad}</td>
              <td className="p-3">{borc.gider?.baslik}</td>
              <td className="p-3 font-semibold">{borc.borc_tutarii} ₺</td>
              <td className="p-3">{format(new Date(borc.borc_tarih), "dd.MM.yyyy")}</td>
              <td className="p-3 text-center">
                <button
                  onClick={() => toggleOdeme(borc)}
                  className={`px-3 py-1 rounded ${
                    borc.odendi
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-red-600 text-white hover:bg-red-700"
                  }`}
                >
                  {borc.odendi ? "Ödendi" : "Ödenmedi"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
