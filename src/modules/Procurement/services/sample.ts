import type {
   CommissionMember,
   CommissionProtocol,
   Procurement,
   ProcurementStep,
   Supplier,
} from '@shared/types/procurement.types';

/* Procurement as of 2 October 2026 (screen 21). The design gives the
   commission's protocols and the suppliers only as counts (4 and 6); the
   sample lists those that other screens name and counts the rest. */

// The steps every tender goes through under the procurement rules.
export const tenderSteps = (done: number, notes: string[]): ProcurementStep[] =>
   [
      'Техническое задание',
      'Документ по закупке (КД)',
      'Публикация на etender',
      'Приём предложений',
      'Оценка комиссией',
      'Протокол комиссии и договор',
   ].map((title, index) => ({
      id: `s${index + 1}`,
      title,
      note: notes[index] ?? '',
      done: index < done,
   }));

export const SAMPLE_PROCUREMENTS: Procurement[] = [
   {
      id: 'acceleration',
      title: 'Акселерационная программа, 12 недель',
      scope: 'Fintech, AI, EdTech, B2B, MedTech · лот неделимый',
      method: 'e_tender',
      price: '950 млн сум с НДС',
      stage: 'documents',
      result: 'ТЗ и КД отрецензированы 21 августа',
      steps: tenderSteps(2, [
         'Отрецензировано 21 августа',
         'Отрецензирован; согласуют О. Турсунов, К. Эргашев, С. Холматов, Т. Бекмуллин, Г. Абдуллаева',
         'Не опубликован',
         'Допускаются нерезиденты и консорциумы',
         '70 баллов — техническая часть, порог 40; 30 баллов — цена',
         'Аванс 50% после подписания, остаток — после акта',
      ]),
   },
   {
      id: 'dd-lawyer',
      title: 'Юрист для DD головных компаний',
      scope: 'МФЦА, Delaware — вне договора с ABACUS',
      method: 'tbd',
      price: '—',
      stage: 'planned',
      result: 'Создана из DD по MoonAI',
      steps: tenderSteps(0, [
         'Описать проверку головных компаний в МФЦА и Delaware',
      ]),
      dealId: 'moonai',
   },
   {
      id: 'abacus',
      title: 'DD и юридическое сопровождение',
      scope: 'лот № 26120012467377',
      method: 'e_tender',
      price: '692,4 млн сум в год',
      stage: 'contract',
      result: 'ООО «ABACUS» · № 22/26-ABACUS',
      steps: tenderSteps(6, [
         '',
         '',
         'Лот № 26120012467377 на etender.uz',
         '',
         'Протокол комиссии от 03.02.2026',
         'Договор № 22/26-ABACUS подписан 21.04.2026',
      ]),
      contractId: 'abacus',
   },
];

export const SAMPLE_COMMISSION: CommissionMember[] = [
   { employeeId: 'e1', role: 'chair' },
   { employeeId: 'e2', role: 'deputy' },
   { employeeId: 'e5', role: 'member' },
   { employeeId: 'e7', role: 'member' },
   { employeeId: 'e6', role: 'secretary' },
];

export const SAMPLE_PROTOCOLS: CommissionProtocol[] = [
   {
      id: 'pr1',
      number: '—',
      date: '2026-02-03',
      procurementId: 'abacus',
      decision: 'Победитель — ООО «ABACUS»',
   },
];

export const SAMPLE_SUPPLIERS: Supplier[] = [
   {
      id: 'abacus',
      name: 'ООО «ABACUS»',
      what: 'DD и юридическое сопровождение',
      contractId: 'abacus',
   },
   {
      id: 'nazarov',
      name: 'И. Назаров',
      what: 'Financial DD по заявкам',
      contractId: 'gph-nazarov',
   },
   {
      id: 'platform',
      name: 'Разработчик цифровой платформы',
      what: 'ТЗ: 9 модулей, 3 фазы',
      contractId: 'gph-platform',
   },
   {
      id: 'photon',
      name: 'PHOTON MC',
      what: 'Управление юрлицом',
      contractId: 'photon',
   },
];

// How many records the fund holds where the sample has only some.
export const SAMPLE_TOTALS = { protocols: 4, suppliers: 6 };

export const COMMISSION_ORDER = '№ 3Р от 30.07.2026';
