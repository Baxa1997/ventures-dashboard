// Sections of the sidebar whose screens are not built yet, with what each one
// is for (from the system map of the design). All texts are keys of the
// "layout" translations.
export const UPCOMING_SECTIONS = [
   {
      path: 'committee',
      group: 'Инвестиции',
      title: 'Инвесткомитет',
      description:
         'Реестр заседаний, повестка, материалы, голосование, протокол; решение уходит в сделку, задачи и платежи.',
   },
   {
      path: 'portfolio',
      group: 'Инвестиции',
      title: 'Портфель',
      description:
         'Компании портфеля, флаги по runway, churn и выручке, квартальная отчётность, запросы компаниям.',
   },
   {
      path: 'finance',
      group: 'Фонд',
      title: 'Финансы',
      description:
         'Свободный остаток из банковских выписок, платежи по сделкам с проверкой оснований, бюджет план-факт, финансовые документы, P&L, движение денег и баланс.',
   },
   {
      path: 'contracts',
      group: 'Фонд',
      title: 'Договоры',
      description:
         'Реестр договоров, карточка с тарифами и лимитами, заказы по рамочному договору (ABACUS).',
   },
   {
      path: 'procurement',
      group: 'Фонд',
      title: 'Закупки',
      description:
         'Закупки по шагам: заявка, комиссия, протокол, договор; сроки каждого шага.',
   },
   {
      path: 'correspondence',
      group: 'Фонд',
      title: 'Корреспонденция',
      description:
         'Входящие и исходящие письма с номерами и сроками ответа; письмо порождает задачу.',
   },
   {
      path: 'documents',
      group: 'Фонд',
      title: 'Документы',
      description:
         'Устав, положения, политики: действующая версия, статус, кем и когда утверждён.',
   },
   {
      path: 'settings',
      group: 'Настройки',
      title: 'Настройки',
      description:
         'Мандат, нормативы стадий, флаги портфеля, правила ИК; сотрудники, роли и права.',
   },
] as const;

export type UpcomingSection = (typeof UPCOMING_SECTIONS)[number];
