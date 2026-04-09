export type RealScheduleRow = {
  month: number;
  nominalInstallment: number;
  discountedInstallment: number;
  paymentDate: string;
  daysFromToday: number;
};

const AVERAGE_DAYS_IN_MONTH = 30.4375;

function toDateOnly(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(from: Date, to: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.round((toDateOnly(to).getTime() - toDateOnly(from).getTime()) / msPerDay));
}

function addMonths(baseDate: Date, months: number) {
  const d = new Date(baseDate);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function calculateRealPrice(
  price: number,
  installmentCount: number,
  monthlyInflationRate: number,
  firstInstallmentDelayMonths = 1,
  purchaseDate = new Date()
) {
  const installmentAmount = price / installmentCount;
  const monthlyRate = monthlyInflationRate / 100;
  const schedule: RealScheduleRow[] = [];

  let totalRealPrice = 0;

  for (let index = 0; index < installmentCount; index += 1) {
    const paymentMonth = firstInstallmentDelayMonths + index;
    const paymentDate = addMonths(purchaseDate, paymentMonth);
    const dayOffset = daysBetween(purchaseDate, paymentDate);
    const monthFraction = dayOffset / AVERAGE_DAYS_IN_MONTH;
    const discounted = installmentAmount / (1 + monthlyRate) ** monthFraction;
    totalRealPrice += discounted;
    schedule.push({
      month: index + 1,
      nominalInstallment: installmentAmount,
      discountedInstallment: discounted,
      paymentDate: paymentDate.toISOString().slice(0, 10),
      daysFromToday: dayOffset,
    });
  }

  return {
    installmentAmount,
    totalRealPrice,
    schedule,
    nominalTotal: price,
    inflationAdvantage: price - totalRealPrice,
  };
}

export function calculateOpportunityGain(
  price: number,
  installmentCount: number,
  monthlyYieldRate: number,
  withholdingTaxRate = 0,
  firstInstallmentDelayMonths = 1,
  purchaseDate = new Date()
) {
  const installmentAmount = price / installmentCount;
  const grossMonthlyRate = monthlyYieldRate / 100;
  const netMonthlyRate = grossMonthlyRate * (1 - withholdingTaxRate / 100);

  let investmentBalance = price;
  let previousDate = toDateOnly(purchaseDate);

  for (let index = 0; index < installmentCount; index += 1) {
    const paymentMonth = firstInstallmentDelayMonths + index;
    const paymentDate = addMonths(purchaseDate, paymentMonth);
    const dayOffset = daysBetween(previousDate, paymentDate);
    const monthFraction = dayOffset / AVERAGE_DAYS_IN_MONTH;
    investmentBalance *= (1 + netMonthlyRate) ** monthFraction;
    investmentBalance -= installmentAmount;
    previousDate = paymentDate;
  }

  return {
    finalBalance: investmentBalance,
    gain: investmentBalance,
    netMonthlyRate,
  };
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(value);
}
