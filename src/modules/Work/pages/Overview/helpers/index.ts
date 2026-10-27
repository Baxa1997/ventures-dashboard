// A sum as short as the design writes it: $850, $150K, $2.45M.
export const formatMoneyShort = (amount: number) => {
   const short = (value: number, unit: string) =>
      `$${Number(value.toFixed(2))}${unit}`;
   if (amount >= 1_000_000) return short(amount / 1_000_000, 'M');
   if (amount >= 1000) return short(amount / 1000, 'K');
   return `$${Math.round(amount)}`;
};

// 2026-Q3 → Q3 2026
export const formatQuarter = (quarter: string) => {
   const [year, number] = quarter.split('-Q');
   return number ? `Q${number} ${year}` : quarter;
};

// The first word of a name, for the greeting: «Abdullo Khidoyatov» → Abdullo.
export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? '';

// Round steps for an axis that reaches at least `max`: 0, 1, 2, 3 for a few
// deals; 0, 5, 10, 15 for more.
export const axisTicks = (max: number) => {
   const top = Math.max(1, max);
   const rough = top / 5;
   const power = 10 ** Math.floor(Math.log10(rough));
   const step =
      top <= 5
         ? 1
         : ([1, 2, 5, 10].map((m) => m * power).find((s) => s >= rough) ??
           10 * power);
   const count = Math.ceil(top / step);
   return Array.from({ length: count + 1 }, (_, index) => index * step);
};
