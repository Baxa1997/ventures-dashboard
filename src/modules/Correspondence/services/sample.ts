import type {
   ControlItem,
   Letter,
   RegularSend,
} from '@shared/types/correspondence.types';

// The letters as of 2 October 2026 (screen 22), from the Notion bases
// «Письма» and «Отправки по регламенту». Owners are the sample's guess.

export const SAMPLE_LETTERS: Letter[] = [
   {
      id: 'l1',
      direction: 'out',
      number: null,
      date: null,
      due: '2026-10-05',
      party: 'Минэкономфин, копия SQB',
      subject: 'Ежемесячная информация об исполнении ПП-59',
      link: { kind: 'regulation', label: 'Регламент ПП-59' },
      status: 'signing',
      ownerId: 'e7',
      replyDue: null,
   },
   {
      id: 'l2',
      direction: 'in',
      number: null,
      date: '2026-09-30',
      due: null,
      party: 'Amity University Tashkent',
      subject:
         'InnovateUZ 2026: программа в октябре, просьба подтвердить участие и USPACE как техпартнёра',
      link: { kind: 'control', label: 'План контроля № 37' },
      status: 'awaiting_fund',
      ownerId: 'e2',
      replyDue: '2026-10-07',
   },
   {
      id: 'l3',
      direction: 'in',
      number: null,
      date: '2026-10-01',
      due: null,
      party: 'ООО «ABACUS»',
      subject: 'Акт за сентябрь 2026 по юридическому сопровождению',
      link: { kind: 'contract', label: '№ 22/26-ABACUS', id: 'abacus' },
      status: 'in_work',
      ownerId: 'e5',
      replyDue: '2026-10-10',
   },
   {
      id: 'l4',
      direction: 'out',
      number: null,
      date: '2026-09-18',
      due: null,
      party: 'EasyTap',
      subject:
         'Запрос документов по Baraka, MoU с Агентством ПТО и входу Жумабаева',
      link: { kind: 'deal', label: 'Сделка EasyTap', id: 'easytap' },
      status: 'awaiting_reply',
      ownerId: 'e3',
      replyDue: null,
   },
   {
      id: 'l5',
      direction: 'out',
      number: '№ 51',
      date: '2026-07-23',
      due: null,
      party: 'Минэкономфин, копия SQB',
      subject:
         'Исполнение ПП-59, протокола КС № 1 от 31.03.2026 и письма МЭФ 02/27-2-17628',
      link: { kind: 'regulation', label: 'Регламент ПП-59' },
      status: 'closed',
      ownerId: 'e2',
      replyDue: null,
   },
   {
      id: 'l6',
      direction: 'in',
      number: '02/27-2-17628',
      date: '2026-07',
      due: null,
      party: 'Минэкономфин',
      subject: 'Запрос информации об исполнении поручений',
      link: { kind: 'letter', label: 'Ответ: исх. № 51', id: 'l5' },
      status: 'closed',
      ownerId: 'e2',
      replyDue: null,
   },
   {
      id: 'l7',
      direction: 'in',
      number: null,
      date: null,
      due: null,
      party: 'Yangi O‘zbekiston University',
      subject: 'Отчёт по договору № 1-SQBVC',
      link: {
         kind: 'contract',
         label: 'Договор № 1-SQBVC',
         id: 'yangi-uzbekiston',
      },
      status: 'closed',
      ownerId: 'e7',
      replyDue: null,
   },
];

export const SAMPLE_SENDS: RegularSend[] = [
   {
      month: '2026-10',
      due: '2026-10-05',
      ownerId: 'e7',
      status: 'in_work',
      letter: null,
   },
   {
      month: '2026-09',
      due: '2026-09-05',
      ownerId: 'e7',
      status: 'sent',
      letter: null,
   },
   {
      month: '2026-08',
      due: '2026-08-05',
      ownerId: 'e7',
      status: 'sent',
      letter: null,
   },
   {
      month: '2026-07',
      due: '2026-07-05',
      ownerId: 'e2',
      status: 'sent',
      letter: '№ 51 от 23.07.2026',
   },
];

export const SAMPLE_CONTROL: ControlItem[] = [
   {
      point: '9(в)',
      text: 'Вузы как генераторы стартапов: Amity University Tashkent, энергоэффективность, InnovateUZ 2026 — октябрь',
      status: 'in_work',
   },
   {
      point: '12(а)',
      text: 'Поддержка энергоэффективных стартапов через единую платформу; финансирование обучения и регистрации ИС — запуск с подразделениями банка',
      status: 'in_work',
   },
];
