import type {
   FundDocument,
   GovernanceIssue,
} from '@shared/types/documents.types';

/* The fund's documents as of 2 October 2026 (screen 23). The corporate list
   is the design's; "Кем утверждён" is its guess by the type of document. Of
   the orders the sample knows one; the HR documents are not on any screen.
   The templates are those the other sections use. */

const doc = (
   document: Omit<FundDocument, 'date' | 'file'> &
      Partial<Pick<FundDocument, 'date' | 'file'>>,
): FundDocument => ({ date: null, file: null, ...document });

export const SAMPLE_DOCUMENTS: FundDocument[] = [
   doc({
      id: 'charter',
      category: 'corporate',
      title: 'Устав ООО «SQB Venchur Loyihalari Fondi»',
      note: 'Перерегистрация под ЗРУ-1137 (с 22.07.2026) · правки нескольких юристов сведены',
      approvedBy: 'participant',
      status: 'reregistration',
   }),
   doc({
      id: 'founding',
      category: 'corporate',
      title: 'Учредительный договор',
      note: '',
      approvedBy: 'participant',
      status: 'active',
   }),
   doc({
      id: 'investment-policy',
      category: 'corporate',
      title: 'Инвестиционная политика',
      note: '16 разделов · мандат, лимиты, порядок сделок',
      approvedBy: 'board',
      status: 'active',
   }),
   doc({
      id: 'ic-regulation',
      category: 'corporate',
      title: 'Положение об Инвестиционном комитете',
      note: 'Новая редакция: расширенные полномочия ИК',
      approvedBy: 'board',
      status: 'updating',
   }),
   doc({
      id: 'board-regulation',
      category: 'corporate',
      title: 'Положение о Наблюдательном совете',
      note: 'Новая редакция вместе с уставом',
      approvedBy: 'participant',
      status: 'updating',
   }),
   doc({
      id: 'procurement-rules',
      category: 'corporate',
      title: 'Порядок закупок',
      note: 'Новая редакция · протокол НС № 1 · комиссия не менее 5 человек',
      approvedBy: 'board',
      status: 'active',
   }),
   doc({
      id: 'scoring',
      category: 'corporate',
      title: 'Методика скоринга',
      note: '7 критериев · матрица CFO',
      approvedBy: 'director',
      status: 'active',
   }),
   doc({
      id: 'order-3r',
      category: 'orders',
      title: '№ 3Р от 30.07.2026',
      note: 'О составе закупочной комиссии',
      approvedBy: 'director',
      status: 'active',
      date: '2026-07-30',
   }),
   doc({
      id: 'report-template',
      category: 'templates',
      title: 'Шаблон отчёта фонда',
      note: '8 блоков · квартальная отчётность портфеля',
      approvedBy: 'director',
      status: 'active',
   }),
   doc({
      id: 'memo-template',
      category: 'templates',
      title: 'Инвестиционный меморандум',
      note: 'Шаблон фонда к ИК-2',
      approvedBy: 'director',
      status: 'active',
   }),
   doc({
      id: 'dd-questionnaire',
      category: 'templates',
      title: 'DD-вопросник',
      note: 'Уходит компании вместе с запросом документов',
      approvedBy: 'director',
      status: 'active',
   }),
   doc({
      id: 'reject-letter',
      category: 'templates',
      title: 'Письмо об отказе',
      note: 'По причине из справочника · срок повторной подачи',
      approvedBy: 'director',
      status: 'active',
   }),
   doc({
      id: 'ic-checklist',
      category: 'templates',
      title: 'Чек-лист ИК',
      note: 'Кворум, материалы, правила голосования',
      approvedBy: 'director',
      status: 'active',
   }),
   doc({
      id: 'act-form',
      category: 'templates',
      title: 'Форма акта оказанных услуг',
      note: 'Для договоров услуг и ГПХ',
      approvedBy: 'director',
      status: 'updating',
   }),
];

export const SAMPLE_ISSUES: GovernanceIssue[] = [
   {
      id: 'i1',
      title: 'Конфликт интересов члена НС в составе ИК',
      note: 'Запрос в департамент банка о квалификации конфликта · ждём ответа',
      status: 'awaiting_reply',
   },
   {
      id: 'i2',
      title: 'Перерегистрация устава',
      note: 'Свести правки юристов, подать по ЗРУ-1137',
      status: 'in_work',
   },
];

// How many the fund's Notion holds where the sample has only some.
export const SAMPLE_TOTALS: Partial<Record<FundDocument['category'], number>> =
   {
      orders: 12,
      hr: 9,
   };
