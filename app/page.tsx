"use client";

import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BanknoteArrowUp, CircleHelp, Scale } from "lucide-react";
import { calculateOpportunityGain, calculateRealPrice, formatCurrency } from "@/lib/finance";

type FormData = {
  price: number;
  installments: number;
  inflation: number;
  yieldRate: number;
  firstInstallmentDate: string;
};

const initialForm: FormData = {
  price: 60000,
  installments: 6,
  inflation: 2.5,
  yieldRate: 3.5,
  firstInstallmentDate: "",
};
const PPF_WITHHOLDING_TAX_RATE = 17.5;

export default function Home() {
  const [form, setForm] = useState<FormData>(initialForm);
  const [inflationLoading, setInflationLoading] = useState(false);
  const [inflationInfo, setInflationInfo] = useState<string>("");
  const [inflationError, setInflationError] = useState<string>("");
  const [showGuide, setShowGuide] = useState(false);

  const todayDate = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => todayDate.toISOString().slice(0, 10), [todayDate]);
  const effectiveFirstInstallmentDate = form.firstInstallmentDate || todayIso;

  const results = useMemo(() => {
    const purchaseDate = todayDate;
    const firstDate = new Date(`${effectiveFirstInstallmentDate}T00:00:00`);
    const firstInstallmentDelayMonths =
      (firstDate.getFullYear() - purchaseDate.getFullYear()) * 12 +
      (firstDate.getMonth() - purchaseDate.getMonth());

    const real = calculateRealPrice(
      form.price,
      form.installments,
      form.inflation,
      Math.max(0, firstInstallmentDelayMonths),
      purchaseDate
    );
    const opportunity = calculateOpportunityGain(
      form.price,
      form.installments,
      form.yieldRate,
      PPF_WITHHOLDING_TAX_RATE,
      Math.max(0, firstInstallmentDelayMonths),
      purchaseDate
    );
    return { real, opportunity };
  }, [effectiveFirstInstallmentDate, form, todayDate]);


  const insight = useMemo(() => {
    const interestGain = Math.max(results.opportunity.gain, 0);
    const inflationGain = Math.max(results.real.inflationAdvantage, 0);
    const totalGain = interestGain + inflationGain;
    return { interestGain, inflationGain, totalGain };
  }, [results]);

  function updateField<K extends keyof FormData>(key: K, value: number | undefined) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const fetchLatestInflation = useCallback(async () => {
    setInflationLoading(true);
    setInflationError("");
    setInflationInfo("");
    try {
      const res = await fetch("/api/inflation");
      const data = (await res.json()) as
        | { month: string; monthlyInflation: number }
        | { error: string };

      if (!res.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Veri alinamadi.");
      }

      updateField("inflation", data.monthlyInflation);
      setInflationInfo(`Son aciklanan veri (${data.month}): %${data.monthlyInflation.toFixed(2)}`);
    } catch {
      setInflationError("Otomatik veri cekilemedi. Lutfen birazdan tekrar deneyin.");
    } finally {
      setInflationLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLatestInflation();
  }, [fetchLatestInflation]);

  useEffect(() => {
    const seen = window.localStorage.getItem("how-it-works-seen");
    setShowGuide(!seen);
    if (!form.firstInstallmentDate) {
      setForm((prev) => ({ ...prev, firstInstallmentDate: todayIso }));
    }
  }, [form.firstInstallmentDate, todayIso]);

  function closeGuide() {
    window.localStorage.setItem("how-it-works-seen", "1");
    setShowGuide(false);
  }

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-6xl gap-7 px-5 py-10 md:gap-8 md:px-8 md:py-14">
      <section className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">
          Taksit Avantaj & Reel Fiyat Hesaplayici
        </h1>
        <p className="max-w-3xl text-base leading-7 text-slate-600 md:text-lg">
          Taksitli alisverisin bugunku reel maliyetini, enflasyon etkisini ve nakit degerlendirme
          senaryosunu tek ekranda karsilastirin.
        </p>
      </section>
      {showGuide ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm md:p-6">
          <h2 className="text-lg font-semibold text-emerald-900 md:text-xl">Nasil Calisir?</h2>
          <p className="mt-2 text-base text-emerald-900 md:text-lg">1) Urun, vade ve oranlari girin; enflasyon verisi otomatik gelir.</p>
          <p className="text-base text-emerald-900 md:text-lg">2) Sistem taksitleri tarih bazli indirger ve fon getirisini net hesaplar.</p>
          <p className="text-base text-emerald-900 md:text-lg">3) Sonuclarda ödediğiniz reel fiyatı ve net kazancınızı görün.</p>
          <button
            type="button"
            onClick={closeGuide}
            className="mt-3 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800"
          >
            Kapat
          </button>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6 space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">Girdi Parametreleri</h2>
          <p className="text-sm text-slate-500">Tum degerler aylik varsayimlar uzerinden hesaplanir.</p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
          <InputBlock
            label="Urun Fiyati (TL)"
            value={form.price}
            onChange={(v) => updateField("price", v)}
            step={1}
          />
          <InputBlock
            label="Taksit Sayisi (Ay)"
            value={form.installments}
            onChange={(v) => updateField("installments", v)}
            step={1}
          />
          <InputBlock
            label="Aylik Tahmini Enflasyon (%)"
            value={form.inflation}
            onChange={() => {}}
            readOnly
            rightAction={
              <button
                type="button"
                onClick={fetchLatestInflation}
                disabled={inflationLoading}
                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {inflationLoading ? "Getiriliyor..." : "Otomatik Getir"}
              </button>
            }
          />
          <InputBlock
            label="Aylik PPF/Faiz Getirisi (%)"
            value={form.yieldRate}
            onChange={(v) => updateField("yieldRate", v)}
            step={0.01}
          />
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Ilk Taksit Tarihi</span>
            <input
              type="date"
              value={effectiveFirstInstallmentDate}
              min={todayIso}
              onChange={(e) => setForm((prev) => ({ ...prev, firstInstallmentDate: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-slate-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
          </label>
        </div>
        {inflationInfo ? <p className="mt-4 text-sm text-emerald-700">{inflationInfo}</p> : null}
        {inflationError ? <p className="mt-4 text-sm text-rose-700">{inflationError}</p> : null}
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
        <ResultCard
          icon={<Scale className="h-5 w-5 text-blue-600" />}
          title="Reel Fiyat (Enflasyon Etkisi)"
          titleTooltip="Reel fiyat, taksitlerin bugunku satin alma gucune gore indirgenmis toplam maliyetidir."
          value={formatCurrency(results.real.totalRealPrice)}
          note={`Nominal fiyata gore reel avantaj: ${formatCurrency(results.real.inflationAdvantage)}`}
        />
        <ResultCard
          icon={<BanknoteArrowUp className="h-5 w-5 text-blue-600" />}
          title="Nakit Kazanci (Net Fon Getirisi)"
          titleTooltip="Net getiri, stopaj dusuldukten sonra kalan fon kazancidir."
          value={formatCurrency(results.opportunity.gain)}
          note={`PPF stopaji sabit %${PPF_WITHHOLDING_TAX_RATE}. Net aylik getiri: %${(results.opportunity.netMonthlyRate * 100).toFixed(2)}`}
          noteTooltip="Stopaj, fon kazanci uzerinden kesilen vergidir. Hesaplamada PPF icin %17.5 sabit kullanilir."
        />
      </section>

      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm md:p-8">
        <h3 className="text-lg font-semibold text-slate-900">Akilli Ozet</h3>
        <p className="mt-2 text-sm leading-7 text-slate-700 md:text-base">
          Bu urunu taksitle alarak hem <strong>{formatCurrency(insight.interestGain)}</strong> fon getirisi
          elde edebilirsin hem de enflasyon sayesinde <strong>{formatCurrency(insight.inflationGain)}</strong>{" "}
          daha az odemis olursun. Toplam potansiyel kazancin <strong>{formatCurrency(insight.totalGain)}</strong>.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-4 space-y-1">
          <h3 className="text-lg font-semibold text-slate-900">Aylik Reel Taksit Degeri</h3>
          <p className="text-sm text-slate-500">Nominal taksit ile enflasyona gore indirgenmis reel degeri karsilastirin.</p>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={results.real.schedule}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="month"
                tickFormatter={(m) => `${m}.Ay`}
                tick={{ fill: "#64748b", fontSize: 12 }}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 12 }}
                tickFormatter={(v) => `${Math.round(v / 1000)}k`}
              />
              <Tooltip
                formatter={(value) =>
                  [
                    formatCurrency(typeof value === "number" ? value : Number(value ?? 0)),
                    "",
                  ] as const
                }
                labelFormatter={(label) => `${label}. Ay`}
                contentStyle={{ borderRadius: 12, borderColor: "#dbeafe" }}
              />
              <Legend />
              <Bar
                dataKey="nominalInstallment"
                name="Nominal"
                fill="#93c5fd"
                radius={[8, 8, 0, 0]}
              />
              <Bar
                dataKey="discountedInstallment"
                name="Reel"
                fill="#2563eb"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </main>
  );
}

function InputBlock({
  label,
  value,
  onChange,
  placeholder,
  rightAction,
  readOnly,
  step,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  rightAction?: ReactNode;
  readOnly?: boolean;
  step?: number;
}) {
  return (
    <label className="grid gap-2">
      <span className="flex items-center justify-between gap-3 text-sm font-medium text-slate-700">
        <span>{label}</span>
        {rightAction}
      </span>
      <input
        type="number"
        min={0}
        step={step ?? 0.01}
        value={value ?? ""}
        placeholder={placeholder}
        readOnly={readOnly}
        onChange={(e) => {
          if (readOnly) return;
          const text = e.target.value.trim();
          onChange(text === "" ? undefined : Number(text));
        }}
        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-slate-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 read-only:bg-slate-50 read-only:text-slate-600"
      />
    </label>
  );
}

function ResultCard({
  icon,
  title,
  titleTooltip,
  value,
  note,
  noteTooltip,
}: {
  icon: ReactNode;
  title: string;
  titleTooltip?: string;
  value: string;
  note: string;
  noteTooltip?: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className="flex items-center gap-1.5 text-lg font-semibold text-slate-900">
          <span>{title}</span>
          {titleTooltip ? <InfoDot text={titleTooltip} /> : null}
        </h3>
      </div>
      <p className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">{value}</p>
      <p className="mt-2 flex items-start gap-1.5 text-sm leading-7 text-slate-600">
        <span>{note}</span>
        {noteTooltip ? <InfoDot text={noteTooltip} className="mt-1" /> : null}
      </p>
    </article>
  );
}

function InfoDot({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={`group relative inline-flex ${className}`}>
      <span
        className="inline-flex h-4 w-4 cursor-help items-center justify-center text-slate-400 hover:text-slate-600"
        aria-label={text}
      >
        <CircleHelp className="h-4 w-4" />
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-60 -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-2 text-xs leading-5 text-white opacity-0 shadow-lg transition group-hover:opacity-100">
        {text}
      </span>
    </span>
  );
}
