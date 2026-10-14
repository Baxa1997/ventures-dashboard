import type {
   AgendaItem,
   CommitteeDecision,
   CommitteeMember,
   DecisionTask,
   Meeting,
   MemberVote,
} from '@shared/types/committee.types';

/* The committee as of 2 October 2026 (screens 12–13 of the design). The
   members are the design's stand-ins ("Состав ИК на макете условный"). Past
   meetings carry only what the register shows; their votes were not moved
   from Notion. ИК № 6.2 and both board meetings are not on the screens: they
   follow from decisions other screens rely on (Tezbor's follow-on, the board's
   approvals before payments, the procurement rules of НС № 1). */

export const SAMPLE_MEMBERS: CommitteeMember[] = [
   {
      id: 'm1',
      name: 'О. Турсунов',
      role: 'chair',
      remote: false,
      contract: 'ГПХ · члены ИК',
   },
   {
      id: 'm2',
      name: 'Н. Хамидова',
      role: 'bank',
      remote: false,
      contract: 'Представитель SQB',
   },
   {
      id: 'm3',
      name: 'J. Lindqvist',
      role: 'international',
      remote: true,
      contract: 'ГПХ · члены ИК',
   },
   {
      id: 'm4',
      name: 'В. Пак',
      role: 'international',
      remote: true,
      contract: 'ГПХ · члены ИК',
   },
   {
      id: 'm5',
      name: 'Т. Расулов',
      role: 'independent',
      remote: false,
      contract: 'ГПХ · члены ИК',
   },
];

const noVotes = (): Record<string, MemberVote> =>
   Object.fromEntries(
      SAMPLE_MEMBERS.map(({ id }) => [id, { choice: null, note: '' }]),
   );

const emptyProtocol = { pros: '', cons: '', conditions: '', next: '' };

// An item of a meeting that was held before the register moved here.
const pastItem = (
   id: string,
   title: string,
   outcome: AgendaItem['outcome'],
   rest: Partial<AgendaItem> = {},
): AgendaItem => ({
   id,
   kind: 'decision',
   title,
   speakerId: '',
   votes: {},
   protocol: emptyProtocol,
   outcome,
   outcomeNote: '',
   ...rest,
});

const pastMeeting = (
   meeting: Pick<Meeting, 'id' | 'body' | 'number' | 'stage' | 'date'> &
      Pick<Meeting, 'summary' | 'result' | 'agenda'>,
): Meeting => ({
   time: '15:00',
   format: 'Очно и по видео',
   secretaryId: 'e7',
   materialsDue: meeting.date,
   materialsSentAt: meeting.date,
   status: 'held',
   startedAt: null,
   breakAt: null,
   chairId: meeting.body === 'ic' ? 'm1' : null,
   attendance: {},
   protocol: 'signed',
   ...meeting,
});

export const SAMPLE_MEETINGS: Meeting[] = [
   {
      id: 'ic-7',
      body: 'ic',
      number: '7',
      stage: 'ic2',
      date: '2026-10-09',
      time: '15:00',
      format: 'Очно и по видео',
      secretaryId: 'e7',
      materialsDue: '2026-10-06',
      materialsSentAt: null,
      status: 'planned',
      startedAt: null,
      breakAt: null,
      chairId: 'm1',
      attendance: {
         m1: 'confirmed',
         m2: 'confirmed',
         m3: 'confirmed',
         m4: 'confirmed',
         m5: 'no_answer',
      },
      agenda: [
         {
            id: 'a1',
            kind: 'decision',
            title: 'EasyTap',
            dealId: 'easytap',
            stage: 'ic2',
            amount: 300_000,
            instrument: 'SAFE',
            speakerId: 'e3',
            facts: [
               {
                  label: 'Предложение',
                  value: '$300 000 по SAFE в раунд $1 000 000',
               },
               {
                  label: 'Рекомендация спонсора',
                  value: 'Conditional · Т. Бекмуллин',
               },
               {
                  label: 'Исключение из мандата',
                  value: 'Стадия Pre-Series A — обоснование в разделе 9 меморандума',
               },
               { label: 'Докладчик', value: 'Д. Мирзаев, аналитик' },
            ],
            memoVersion: 3,
            votes: noVotes(),
            // drafted by the secretary from the memorandum before the meeting
            protocol: {
               pros: 'Расчётный контур SQB в Узбекистане; GMV ×2,6; положительная EBITDA 2025',
               cons: 'Цена входа выше оценки DD; головная компания не проверена; заявления без документов',
               conditions:
                  'Cap не выше $9M или дисконт без cap · Legal DD головной компании · документы по Baraka и MoU',
               next: 'Переговоры об условиях SAFE · ответ компании до 23 октября',
            },
            outcome: null,
            outcomeNote: '',
         },
         {
            id: 'a2',
            kind: 'decision',
            title: 'USPACE',
            dealId: 'uspace',
            stage: 'ic2',
            amount: 250_000,
            speakerId: 'e2',
            materials: { ready: 6, total: 6 },
            facts: [
               { label: 'Предложение', value: '$250 000' },
               { label: 'Отрасль', value: 'ESCO, умное уличное освещение' },
               {
                  label: 'Докладчик',
                  value: 'Ш. Юлдашев, заместитель директора',
               },
            ],
            votes: noVotes(),
            protocol: emptyProtocol,
            outcome: null,
            outcomeNote: '',
         },
         {
            id: 'a3',
            kind: 'info',
            title: 'Портфель: сбор отчётов за III квартал',
            speakerId: 'e5',
            facts: [
               {
                  label: 'Что докладывается',
                  value: 'Сбор квартальных отчётов портфельных компаний',
               },
               { label: 'Срок сдачи', value: '25 октября' },
               { label: 'Докладчик', value: 'Р. Исмаилов, проектный менеджер' },
            ],
            votes: {},
            protocol: emptyProtocol,
            outcome: null,
            outcomeNote: '',
         },
      ],
      summary: 'EasyTap, USPACE',
      result: 'planned',
      protocol: 'none',
   },
   pastMeeting({
      id: 'ic-6-3',
      body: 'ic',
      number: '6.3',
      stage: 'ic2',
      date: '2026-09-18',
      summary: 'Recepta (Sandiq) · $150 000',
      result: 'approved_conditions',
      agenda: [
         pastItem('a1', 'Recepta (Sandiq)', 'approved_conditions', {
            dealId: 'recepta',
            stage: 'ic2',
            amount: 150_000,
            instrument: 'SAFE',
         }),
      ],
   }),
   pastMeeting({
      id: 'ic-6-2',
      body: 'ic',
      number: '6.2',
      stage: 'ic2',
      date: '2026-09-04',
      summary: 'Tezbor · follow-on $300 000',
      result: 'approved',
      agenda: [
         pastItem('a1', 'Tezbor · follow-on', 'approved', {
            dealId: 'tezbor-follow-on',
            stage: 'ic2',
            amount: 300_000,
         }),
      ],
   }),
   pastMeeting({
      id: 'ic-6-1',
      body: 'ic',
      number: '6.1',
      stage: 'ic1',
      date: '2026-08-21',
      summary: 'MoonAI, Pandev · переход к детальному DD',
      result: 'approved',
      agenda: [
         pastItem('a1', 'MoonAI', 'approved', {
            dealId: 'moonai',
            stage: 'ic1',
         }),
         pastItem('a2', 'Pandev', 'approved', {
            dealId: 'pandev',
            stage: 'ic1',
         }),
      ],
   }),
   pastMeeting({
      id: 'ic-6',
      body: 'ic',
      number: '6',
      stage: 'ic1',
      date: '2026-04-30',
      summary: 'EasyTap · переход к детальному DD',
      result: 'approved',
      agenda: [
         pastItem('a1', 'EasyTap', 'approved', {
            dealId: 'easytap',
            stage: 'ic1',
         }),
      ],
   }),
   pastMeeting({
      id: 'ic-5',
      body: 'ic',
      number: '5',
      stage: 'ic2',
      date: '2026-03-12',
      summary: 'Robosell · follow-on',
      result: 'postponed',
      agenda: [
         pastItem('a1', 'Robosell · follow-on', 'postponed', { stage: 'ic2' }),
      ],
   }),
   pastMeeting({
      id: 'board-2',
      body: 'board',
      number: '2',
      stage: null,
      date: '2026-09-25',
      summary: 'Recepta (Sandiq) · $150 000; Tezbor · follow-on $300 000',
      result: 'approved',
      agenda: [
         pastItem('a1', 'Recepta (Sandiq)', 'approved', {
            dealId: 'recepta',
            amount: 150_000,
         }),
         pastItem('a2', 'Tezbor · follow-on', 'approved', {
            dealId: 'tezbor-follow-on',
            amount: 300_000,
         }),
      ],
   }),
   pastMeeting({
      id: 'board-1',
      body: 'board',
      number: '1',
      stage: null,
      date: '2026-07-17',
      summary: 'Порядок закупок в новой редакции',
      result: 'approved',
      agenda: [pastItem('a1', 'Порядок закупок в новой редакции', 'approved')],
   }),
];

export const SAMPLE_DECISIONS: CommitteeDecision[] = [
   {
      id: 'd1',
      meetingId: 'board-2',
      body: 'board',
      meetingLabel: 'НС № 2',
      date: '2026-09-25',
      subject: 'Recepta (Sandiq) · $150 000 SAFE',
      outcome: 'approved',
      note: 'Платёж после подписания SAFE',
      dealId: 'recepta',
   },
   {
      id: 'd2',
      meetingId: 'board-2',
      body: 'board',
      meetingLabel: 'НС № 2',
      date: '2026-09-25',
      subject: 'Tezbor · follow-on $300 000',
      outcome: 'approved',
      note: 'Платёж после доп. соглашения',
      dealId: 'tezbor-follow-on',
   },
   {
      id: 'd3',
      meetingId: 'ic-6-3',
      body: 'ic',
      meetingLabel: 'ИК № 6.3',
      date: '2026-09-18',
      subject: 'Recepta (Sandiq) · $150 000 SAFE',
      outcome: 'approved_conditions',
      note: 'Условие: подписать SAFE до 6 октября',
      dealId: 'recepta',
   },
   {
      id: 'd4',
      meetingId: 'ic-6-2',
      body: 'ic',
      meetingLabel: 'ИК № 6.2',
      date: '2026-09-04',
      subject: 'Tezbor · follow-on $300 000',
      outcome: 'approved',
      note: '',
      dealId: 'tezbor-follow-on',
   },
   {
      id: 'd5',
      meetingId: 'ic-6-1',
      body: 'ic',
      meetingLabel: 'ИК № 6.1',
      date: '2026-08-21',
      subject: 'MoonAI · переход к детальному DD',
      outcome: 'approved_conditions',
      note: 'Условие: Legal DD головной компании до ИК-2',
      dealId: 'moonai',
   },
   {
      id: 'd6',
      meetingId: 'ic-6-1',
      body: 'ic',
      meetingLabel: 'ИК № 6.1',
      date: '2026-08-21',
      subject: 'Pandev · переход к детальному DD',
      outcome: 'approved',
      note: 'Срок DD истёк 28 сентября',
      dealId: 'pandev',
   },
   {
      id: 'd7',
      meetingId: 'board-1',
      body: 'board',
      meetingLabel: 'НС № 1',
      date: '2026-07-17',
      subject: 'Порядок закупок в новой редакции',
      outcome: 'approved',
      note: 'Закупочная комиссия — не менее 5 человек',
   },
   {
      id: 'd8',
      meetingId: 'ic-6',
      body: 'ic',
      meetingLabel: 'ИК № 6',
      date: '2026-04-30',
      subject: 'EasyTap · переход к детальному DD',
      outcome: 'approved',
      note: '',
      dealId: 'easytap',
   },
   {
      id: 'd9',
      meetingId: 'ic-5',
      body: 'ic',
      meetingLabel: 'ИК № 5',
      date: '2026-03-12',
      subject: 'Robosell · follow-on',
      outcome: 'postponed',
      note: 'Follow-on $100K остаётся в плане 2026',
   },
   // investments of the portfolio, decided before the register moved here
   {
      id: 'd10',
      meetingId: null,
      body: 'ic',
      meetingLabel: 'ИК · 2025',
      date: null,
      subject: 'Tezbor · доля $200 000',
      outcome: 'approved',
      note: '',
   },
   {
      id: 'd11',
      meetingId: null,
      body: 'ic',
      meetingLabel: 'ИК · 2025',
      date: null,
      subject: 'Redeem · SAFE $150 000',
      outcome: 'approved',
      note: '',
   },
   {
      id: 'd12',
      meetingId: null,
      body: 'ic',
      meetingLabel: 'ИК · 2024',
      date: null,
      subject: 'Verifix · доля $250 000',
      outcome: 'approved',
      note: '',
   },
   {
      id: 'd13',
      meetingId: null,
      body: 'ic',
      meetingLabel: 'ИК · 2024',
      date: null,
      subject: 'Robosell · SAFE $200 000',
      outcome: 'approved',
      note: '',
   },
   {
      id: 'd14',
      meetingId: null,
      body: 'ic',
      meetingLabel: 'ИК · 2024',
      date: null,
      subject: 'Clockster · SAFE $150 000',
      outcome: 'approved',
      note: '',
   },
   {
      id: 'd15',
      meetingId: null,
      body: 'board',
      meetingLabel: 'НС',
      date: null,
      subject: 'Инвестиционная политика · 16 разделов',
      outcome: 'approved',
      note: 'Мандат, лимиты, порядок сделок',
   },
];

export const SAMPLE_TASKS: DecisionTask[] = [
   {
      id: 't1',
      title: 'Подписать SAFE с Recepta (Sandiq)',
      basis: 'Условие ИК № 6.3',
      ownerId: 'e5',
      due: { date: '2026-10-06' },
      done: false,
   },
   {
      id: 't2',
      title: 'Legal DD головной компании MoonAI',
      basis: 'Условие ИК № 6.1',
      ownerId: 'e5',
      due: { label: 'до ИК-2' },
      done: false,
   },
   {
      id: 't3',
      title: 'Продлить DD Pandev или вынести отказ',
      basis: 'Срок DD по решению ИК № 6.1 истёк',
      ownerId: 'e1',
      due: { date: '2026-09-28' },
      done: false,
   },
];

// How many records the fund's register holds where the sample has only some.
export const SAMPLE_TOTALS = { meetings: 7, decisions: 16 };
