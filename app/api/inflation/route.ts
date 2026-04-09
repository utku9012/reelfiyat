import { NextResponse } from "next/server";

const TCMB_INFLATION_URL =
  "https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Istatistikler/Enflasyon+Verileri/Tuketici+Fiyatlari";

type InflationPayload = {
  month: string;
  monthlyInflation: number;
  source: string;
};

function parseLatestMonthlyInflation(html: string): InflationPayload | null {
  // Robust pattern for TCMB page: first match catches latest row values.
  const rowRegex = /(\d{2}-\d{4})[\s\S]{0,120}?([\d]+[.,][\d]+)[\s\S]{0,120}?([\d]+[.,][\d]+)/;
  const match = html.match(rowRegex);
  if (!match) return null;

  const month = match[1];
  const monthlyStr = match[3].replace(",", ".");
  const monthlyInflation = Number(monthlyStr);
  if (!Number.isFinite(monthlyInflation)) return null;

  return {
    month,
    monthlyInflation,
    source: TCMB_INFLATION_URL,
  };
}

export async function GET() {
  try {
    const res = await fetch(TCMB_INFLATION_URL, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Veri kaynagina erisilemedi." }, { status: 502 });
    }

    const html = await res.text();
    const parsed = parseLatestMonthlyInflation(html);

    if (!parsed) {
      return NextResponse.json({ error: "Enflasyon verisi ayrisamadi." }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Enflasyon verisi cekilirken hata olustu." }, { status: 500 });
  }
}
