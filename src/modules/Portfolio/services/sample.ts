import type {
   CompanyRequest,
   Metric,
   PortfolioCompany,
   QuarterReport,
   ReportingCycle,
} from '@shared/types/portfolio.types';

/* The portfolio as of 2 October 2026 (screens 14–16). Amounts and
   instruments are the design's ("примерные"); the total $950 000 is from the
   report under ПП-59. Verifix's figures are the design's stand-ins; Clockster's
   are made up for the sample, so that its report has something to confirm. */

export const SAMPLE_CYCLE: ReportingCycle = {
   quarter: '2026-Q3',
   due: '2026-10-25',
   requestedAt: '2026-10-01',
   remindedAt: '2026-10-01',
   autoReminderAt: '2026-10-20',
};

const all = (day: string): QuarterReport => ({
   received: {
      fund_template: day,
      company_template: day,
      form1: day,
      form2: day,
   },
   metrics: 'confirmed',
   filledAt: day,
});

const pending: QuarterReport = {
   received: {},
   metrics: 'none',
   filledAt: null,
};

const metrics = (
   rows: [
      key: Metric['key'],
      format: Metric['format'],
      q1: number,
      q2: number,
      q3?: number,
   ][],
): Metric[] =>
   rows.map(([key, format, q1, q2, q3]) => ({
      key,
      format,
      values: { '2026-Q1': q1, '2026-Q2': q2, '2026-Q3': q3 ?? null },
   }));

export const SAMPLE_COMPANIES: PortfolioCompany[] = [
   {
      id: 'clockster',
      name: 'Clockster',
      tagline: 'Учёт линейного персонала',
      about: 'Учёт рабочего времени линейного персонала',
      countries: 'UZ',
      instrument: 'safe',
      invested: 150_000,
      since: 2024,
      ownerId: 'e5',
      now: '',
      facts: [
         { label: 'Продукт', value: 'Учёт смен и рабочего времени' },
         { label: 'Страны', value: 'Узбекистан' },
      ],
      position: {
         valuation: 'по SAFE · без оценки',
         moic: '1,0× по стоимости входа',
      },
      reports: {
         '2026-Q1': all('2026-04-20'),
         '2026-Q2': all('2026-07-21'),
         '2026-Q3': {
            received: {
               fund_template: '2026-10-01',
               company_template: '2026-10-01',
               form1: '2026-10-01',
               form2: '2026-10-01',
            },
            metrics: 'check',
            filledAt: '2026-10-01',
         },
      },
      metrics: metrics([
         ['mrr', 'usd', 12_400, 13_900, 15_100],
         ['revenue', 'usd', 35_600, 40_200, 44_800],
         ['margin', 'percent', 64, 66, 67],
         ['burn', 'usd', -9_800, -9_100, -8_700],
         ['runway', 'months', 11, 12, 13],
         ['clients', 'number', 58, 64, 71],
         ['churn', 'percent', 4.2, 3.8, 3.5],
         ['team', 'number', 14, 15, 15],
      ]),
      pilots: [],
   },
   {
      id: 'verifix',
      name: 'Verifix',
      tagline: 'HRM-платформа · 30 000+ пользователей',
      about: 'HRM-платформа для линейного персонала',
      countries: 'UZ, KZ, KG, TJ, MN',
      instrument: 'equity',
      invested: 250_000,
      since: 2024,
      ownerId: 'e2',
      now: 'Пилоты с HR SQB завершены успешно; коммерческий договор с банком на согласовании',
      dealId: 'verifix',
      facts: [
         { label: 'Пользователи', value: '30 000+ активных' },
         {
            label: 'Страны',
            value: 'Узбекистан, Казахстан, Кыргызстан, Таджикистан, Монголия',
         },
         { label: 'Клиенты', value: 'Makro, Ermak, Samsung и другие' },
      ],
      position: {
         valuation: 'по раунду входа · не обновлялась',
         moic: '1,0× по стоимости входа',
      },
      reports: {
         '2026-Q1': all('2026-04-22'),
         '2026-Q2': all('2026-07-23'),
         '2026-Q3': pending,
      },
      metrics: metrics([
         ['mrr', 'usd', 38_200, 41_900],
         ['revenue', 'usd', 109_400, 121_300],
         ['margin', 'percent', 71, 73],
         ['burn', 'usd', -18_500, -14_200],
         ['runway', 'months', 14, 17],
         ['clients', 'number', 212, 236],
         ['churn', 'percent', 3.1, 2.4],
         ['team', 'number', 34, 37],
      ]),
      pilots: [
         {
            id: 'p1',
            title: 'Грейдинг персонала',
            customer: 'HR-департамент SQB',
            status: 'success',
            note: 'Испытание завершено, результат принят заказчиком',
         },
         {
            id: 'p2',
            title: '«Махалля банкири»',
            customer: 'HR-департамент SQB',
            status: 'success',
            note: 'Испытание завершено, результат принят заказчиком',
         },
      ],
      commercial: {
         title: 'Коммерческий договор Verifix с банком',
         note: 'На согласовании с сентября 2026 · фонд сопровождает как акционер',
      },
   },
   {
      id: 'robosell',
      name: 'Robosell',
      tagline: 'Конструктор онлайн-продаж',
      about: 'Конструктор онлайн-продаж',
      countries: 'UZ',
      instrument: 'safe',
      invested: 200_000,
      since: 2024,
      ownerId: 'e5',
      now: 'Follow-on $100K в плане 2026, без решения ИК',
      facts: [],
      position: {
         valuation: 'по SAFE · без оценки',
         moic: '1,0× по стоимости входа',
      },
      reports: {
         '2026-Q1': all('2026-04-24'),
         '2026-Q2': all('2026-07-24'),
         '2026-Q3': pending,
      },
      metrics: [],
      pilots: [],
   },
   {
      id: 'tezbor',
      name: 'Tezbor',
      tagline: 'Логистика',
      about: 'Логистика',
      countries: 'UZ',
      instrument: 'equity',
      invested: 200_000,
      since: 2025,
      ownerId: 'e5',
      now: 'Follow-on $300K одобрен — юр. оформление',
      dealId: 'tezbor',
      facts: [],
      position: {
         valuation: 'по раунду входа · не обновлялась',
         moic: '1,0× по стоимости входа',
      },
      reports: {
         '2026-Q1': all('2026-04-21'),
         '2026-Q2': all('2026-07-22'),
         '2026-Q3': pending,
      },
      metrics: [],
      pilots: [],
   },
   {
      id: 'redeem',
      name: 'Redeem',
      tagline: '',
      about: '',
      countries: '',
      instrument: 'safe',
      invested: 150_000,
      since: 2025,
      ownerId: 'e3',
      now: '',
      facts: [],
      position: {
         valuation: 'по SAFE · без оценки',
         moic: '1,0× по стоимости входа',
      },
      reports: {
         '2026-Q1': all('2026-04-27'),
         '2026-Q2': all('2026-07-27'),
         '2026-Q3': pending,
      },
      metrics: [],
      pilots: [],
   },
];

export const SAMPLE_REQUESTS: CompanyRequest[] = [
   {
      id: 'r1',
      companyId: 'redeem',
      title: 'Запрос интро к ритейл-клиентам банка',
      openedAt: '2026-09-25',
      status: 'waiting_fund',
      note: '',
      ownerId: 'e3',
      answer: '',
   },
   {
      id: 'r2',
      companyId: 'robosell',
      title: 'Follow-on $100K',
      openedAt: '2026-09-10',
      status: 'in_work',
      note: 'В плане 2026, без решения ИК',
      ownerId: 'e5',
      answer: '',
   },
   {
      id: 'r3',
      companyId: 'verifix',
      title: 'Сопровождение коммерческого договора с банком',
      openedAt: '2026-09-01',
      status: 'in_work',
      note: 'Фонд сопровождает как акционер',
      ownerId: 'e2',
      answer: '',
   },
];
