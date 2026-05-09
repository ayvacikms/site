import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { giderId, uyeIds, tur, tutar, baslangic, bitis, sonOdeme } = req.body;

  if (!uyeIds || uyeIds.length === 0) {
    return res.status(400).send("Üye seçilmedi");
  }

  const kisiSayisi = uyeIds.length;
  const kisiBasiTutar = tutar / kisiSayisi;

  let borclar: any[] = [];

  if (tur === "sabit") {
    const start = new Date(baslangic);
    const end = new Date(bitis);
    let current = new Date(start);

    while (current <= end) {
      for (const uyeId of uyeIds) {
        borclar.push({
          gider_id: giderId,
          uye_id: uyeId,
          borc_tutar: kisiBasiTutar,
          borc_tarih: new Date(current),
          odendi: false,
        });
      }
      current.setMonth(current.getMonth() + 1);
    }
  } else {
    for (const uyeId of uyeIds) {
      borclar.push({
        gider_id: giderId,
        uye_id: uyeId,
        borc_tutar: kisiBasiTutar,
        borc_tarih: sonOdeme,
        odendi: false,
      });
    }
  }

  const { error } = await supabase.from("gider_uyeler").insert(borclar);
  if (error) return res.status(500).send(error.message);

  res.status(200).send("Borçlandırma tamamlandı");
}
