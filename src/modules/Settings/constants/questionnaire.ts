import type { QuestionSection } from '@shared/types/settings.types';

/* The fund's questionnaire to the founder, as the design has it, used until
   Настройки has one of its own (batch 17). The startup cabinet keeps the same
   list for the same case (src/shared/constants/questionnaire.ts there). */
export const BUILT_IN_QUESTIONNAIRE: QuestionSection[] = [
   {
      id: 'team',
      title: {
         ru: 'Команда и структура капитала',
         uz: 'Jamoa va cap table',
         en: 'Team and cap table',
      },
      fields: [
         {
            id: 'cofounders',
            kind: 'area',
            label: {
               ru: 'Сооснователи: имена, роли и опыт',
               uz: 'Hammuassislar: ismlari, rollari va tajribasi',
               en: 'Co-founders: names, roles and background',
            },
         },
         {
            id: 'captable',
            kind: 'area',
            label: {
               ru: 'Cap table: кому какая доля принадлежит',
               uz: 'Cap table: kimga qancha ulush tegishli',
               en: 'Cap table: who owns what share',
            },
         },
         {
            id: 'vacancies',
            kind: 'number',
            label: {
               ru: 'Открытые вакансии',
               uz: 'Ochiq vakansiyalar',
               en: 'Open vacancies',
            },
         },
      ],
   },
   {
      id: 'product',
      title: {
         ru: 'Продукт и метрики',
         uz: 'Mahsulot va metrikalar',
         en: 'Product and metrics',
      },
      fields: [
         {
            id: 'problem',
            kind: 'area',
            label: {
               ru: 'Какую проблему вы решаете и для кого?',
               uz: 'Qaysi muammoni va kim uchun hal qilasiz?',
               en: 'What problem do you solve, and for whom?',
            },
         },
         {
            id: 'product',
            kind: 'area',
            label: {
               ru: 'Что продукт умеет сегодня?',
               uz: 'Mahsulot bugun nimalarni qila oladi?',
               en: 'What does the product do today?',
            },
         },
         {
            id: 'users',
            kind: 'number',
            label: {
               ru: 'Активные пользователи',
               uz: 'Faol foydalanuvchilar',
               en: 'Active users',
            },
         },
         {
            id: 'paying',
            kind: 'number',
            label: {
               ru: 'Платящие клиенты',
               uz: 'To‘lovchi mijozlar',
               en: 'Paying customers',
            },
         },
      ],
   },
   {
      id: 'market',
      title: {
         ru: 'Рынок и конкуренты',
         uz: 'Bozor va raqobatchilar',
         en: 'Market and competitors',
      },
      fields: [
         {
            id: 'size',
            kind: 'area',
            label: {
               ru: 'TAM / SAM / SOM и откуда эти цифры',
               uz: 'TAM / SAM / SOM va bu raqamlar manbasi',
               en: 'TAM / SAM / SOM and the source of the numbers',
            },
         },
         {
            id: 'competitors',
            kind: 'area',
            label: {
               ru: 'Основные конкуренты',
               uz: 'Asosiy raqobatchilar',
               en: 'Main competitors',
            },
         },
         {
            id: 'usp',
            kind: 'area',
            label: {
               ru: 'Почему вы у них выигрываете',
               uz: 'Nega ulardan ustun kelasiz',
               en: 'Why you win against them',
            },
         },
      ],
   },
   {
      id: 'finance',
      title: { ru: 'Финансы', uz: 'Moliya', en: 'Finance' },
      fields: [
         {
            id: 'mrr',
            kind: 'number',
            label: {
               ru: 'Выручка в месяц, USD',
               uz: 'Oylik tushum, USD',
               en: 'Monthly revenue, USD',
            },
         },
         {
            id: 'costs',
            kind: 'number',
            label: {
               ru: 'Расходы в месяц, USD',
               uz: 'Oylik xarajatlar, USD',
               en: 'Monthly expenses, USD',
            },
         },
         {
            id: 'runway',
            kind: 'select',
            label: { ru: 'Runway', uz: 'Runway', en: 'Runway' },
            options: [
               {
                  ru: 'Меньше 3 месяцев',
                  uz: '3 oydan kam',
                  en: 'Less than 3 months',
               },
               { ru: '3–6 месяцев', uz: '3–6 oy', en: '3–6 months' },
               { ru: '6–12 месяцев', uz: '6–12 oy', en: '6–12 months' },
               { ru: '1–2 года', uz: '1–2 yil', en: '1–2 years' },
            ],
         },
         {
            id: 'previous',
            kind: 'area',
            label: {
               ru: 'Прошлые инвестиции: кто, когда и сколько',
               uz: 'Oldingi investitsiyalar: kim, qachon va qancha',
               en: 'Previous investment: who, when and how much',
            },
         },
      ],
   },
   {
      id: 'ask',
      title: {
         ru: 'Использование средств',
         uz: 'Mablag‘lardan foydalanish',
         en: 'Use of funds',
      },
      fields: [
         {
            id: 'amount',
            kind: 'number',
            label: {
               ru: 'Сколько вы привлекаете, USD',
               uz: 'Qancha jalb qilyapsiz, USD',
               en: 'Amount you are raising, USD',
            },
         },
         {
            id: 'use',
            kind: 'area',
            label: {
               ru: 'На что пойдут деньги?',
               uz: 'Pul nimalarga sarflanadi?',
               en: 'What will the money pay for?',
            },
         },
      ],
   },
   {
      id: 'risks',
      title: { ru: 'Риски', uz: 'Xavflar', en: 'Risks' },
      fields: [
         {
            id: 'risks',
            kind: 'area',
            label: {
               ru: 'Ключевые риски и ограничения бизнеса',
               uz: 'Biznesning asosiy xavflari va cheklovlari',
               en: 'Key risks and limits of the business',
            },
         },
      ],
   },
   {
      id: 'docs',
      title: {
         ru: 'Финмодель и видео-питч',
         uz: 'Moliyaviy model va video-pitch',
         en: 'Financial model and video pitch',
      },
      fields: [
         {
            id: 'model',
            kind: 'text',
            label: {
               ru: 'Ссылка на финансовую модель',
               uz: 'Moliyaviy modelga havola',
               en: 'Link to the financial model',
            },
         },
         {
            id: 'video',
            kind: 'text',
            label: {
               ru: 'Ссылка на видео-питч на 3–5 минут',
               uz: '3–5 daqiqalik video-pitchga havola',
               en: 'Link to a 3–5 minute video pitch',
            },
         },
      ],
   },
   {
      id: 'legal',
      title: { ru: 'Юридические вопросы', uz: 'Yuridik masalalar', en: 'Legal' },
      fields: [
         {
            id: 'ip',
            kind: 'yesno',
            label: {
               ru: 'Интеллектуальная собственность принадлежит компании?',
               uz: 'Intellektual mulk kompaniyaga tegishlimi?',
               en: 'Is the intellectual property owned by the company?',
            },
         },
         {
            id: 'debts',
            kind: 'yesno',
            label: {
               ru: 'Есть ли у компании долги или открытые судебные споры?',
               uz: 'Kompaniyaning qarzlari yoki ochiq sud nizolari bormi?',
               en: 'Does the company have debts or open legal claims?',
            },
         },
      ],
   },
];
