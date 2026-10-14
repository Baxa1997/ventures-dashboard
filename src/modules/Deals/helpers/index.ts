import {
   addWorkingDays,
   formatDate,
   formatDay,
   downloadCsv,
   personName,
   todayISO,
} from '@shared/helpers';
import type {
   CheckItem,
   Criterion,
   Deal,
   PathStep,
   Tone,
} from '@shared/types/deals.types';
import type { DealStage } from '@shared/types/work.types';
import type { TFunction } from 'i18next';
import type { NormStage } from '@shared/types/settings.types';
import {
   currentSettings,
   parseCheck,
   parseNorm,
} from '@modules/Settings/services';
import {
   CLOSED_STATUSES,
   CRITERIA,
   MANDATE,
   REJECT_REASON_LABELS,
   ROUND_STAGE_NAMES,
   SOURCE_LABELS,
   STAGE_LABELS,
   STAGE_NEXT_LABELS,
   STAGE_NORMS,
   STAGES,
   STATUS_LABELS,
   STATUS_TONES,
} from '../constants';

type T = TFunction<'deals'>;

// A stamp is "YYYY-MM-DD" or "YYYY-MM-DD HH:mm".
export const dayOf = (stamp: string) => stamp.slice(0, 10);
export const timeOf = (stamp: string) => stamp.slice(11);

// 2 октября, 09:14
export const formatStamp = (stamp: string) =>
   [formatDate(dayOf(stamp)), timeOf(stamp)].filter(Boolean).join(', ');

export { downloadCsv, personName };

// The check range of the mandate, as Настройки have it now.
export const mandateLimits = () => {
   const range = parseCheck(currentSettings().mandate.check);
   return range
      ? { minCheck: range[0], maxCheck: range[1] }
      : { minCheck: MANDATE.minCheck, maxCheck: MANDATE.maxCheck };
};

// The stages whose norm Настройки give in working days.
const SETTINGS_STAGES: Partial<Record<DealStage, NormStage>> = {
   inbox: 'inbox',
   screening: 'screening',
   meeting: 'meeting',
   analysis: 'analysis',
   dd: 'dd',
   closing: 'closing',
};

// Working days a deal may stay on a stage: from Настройки where they give a
// number, otherwise the stage's own rule.
export const stageNorm = (stage: DealStage) => {
   const key = SETTINGS_STAGES[stage];
   const norm =
      key && currentSettings().norms.find((item) => item.stage === key);
   return (norm && parseNorm(norm.norm)) || STAGE_NORMS[stage];
};

// $250K, $1,5M
export const formatAmount = (amount: number, language: string) =>
   amount >= 1_000_000
      ? `$${new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(amount / 1_000_000)}M`
      : `$${Math.round(amount / 1000)}K`;

export const sumAmounts = (deals: Deal[]) =>
   deals.reduce((sum, deal) => sum + deal.amount, 0);

export const isOpen = ({ status }: Deal) =>
   status === 'review' || status === 'active';

export const isClosed = ({ status }: Deal) => CLOSED_STATUSES.includes(status);

export const nextStageOf = (stage: DealStage): DealStage | null =>
   STAGES[STAGES.indexOf(stage) + 1] ?? null;

// ---- the fund's deadline on a stage

export type Deadline =
   | { kind: 'none' | 'waiting' }
   | { kind: 'overdue' | 'left'; days: number }
   | { kind: 'committee'; number: number; date: string };

export const getDeadline = (deal: Deal): Deadline => {
   if (deal.status !== 'active' || !deal.days) return { kind: 'none' };
   if (deal.waiting) return { kind: 'waiting' };
   const { used, norm } = deal.days;
   if (used > norm) return { kind: 'overdue', days: used - norm };
   if (deal.committee) return { kind: 'committee', ...deal.committee };
   return { kind: 'left', days: norm - used };
};

export const deadlineTone = ({ kind }: Deadline): Tone => {
   if (kind === 'overdue') return 'danger';
   return kind === 'waiting' ? 'warning' : 'accent';
};

export const deadlineLabel = (t: T, deadline: Deadline) => {
   if (deadline.kind === 'overdue')
      return t('Просрочено на {{count}} день', { count: deadline.days });
   if (deadline.kind === 'waiting') return t('Ждём заявителя');
   if (deadline.kind === 'committee')
      return t('ИК № {{number}} · {{date}}', {
         number: deadline.number,
         date: formatDate(deadline.date),
      });
   if (deadline.kind === 'left')
      return t('Осталось {{days}} р.д.', { days: deadline.days });
   return '';
};

// The day an incoming application has to be decided on by.
export const triageDue = (deal: Deal) =>
   addWorkingDays(dayOf(deal.receivedAt), stageNorm('inbox') ?? 0);

export type TriageState = 'waiting' | 'overdue' | 'today' | 'ahead';

export const triageState = (deal: Deal, today = todayISO()): TriageState => {
   if (deal.waiting) return 'waiting';
   const due = triageDue(deal);
   if (due < today) return 'overdue';
   return due === today ? 'today' : 'ahead';
};

// Whether the fund has missed its own deadline on the deal.
export const isLate = (deal: Deal, today = todayISO()) =>
   deal.status === 'review'
      ? triageState(deal, today) === 'overdue'
      : getDeadline(deal).kind === 'overdue';

export const nextTitle = (t: T, deal: Deal) =>
   deal.next?.title || t(STAGE_NEXT_LABELS[deal.stage]);

// "до 8 октября", "сегодня", "срок был 30 сентября", "6 октября, 11:00"
export const dueText = (
   t: T,
   { dueDate, time }: { dueDate: string; time?: string },
   today = todayISO(),
) => {
   if (time) return `${formatDate(dueDate)}, ${time}`;
   if (dueDate < today)
      return t('срок был {{date}}', { date: formatDate(dueDate) });
   if (dueDate === today) return t('сегодня');
   return t('до {{date}}', { date: formatDate(dueDate) });
};

// ---- how a deal is described in lists

export const statusOf = (t: T, deal: Deal) =>
   deal.status === 'active'
      ? { label: t(STAGE_LABELS[deal.stage]), tone: 'accent' as Tone }
      : {
           label: t(STATUS_LABELS[deal.status]),
           tone: STATUS_TONES[deal.status],
        };

// The badge next to the name in a deal's card: the stage and how its deadline stands.
export const headerBadge = (t: T, deal: Deal) => {
   const { label } = statusOf(t, deal);
   if (deal.status === 'review') {
      const state = triageState(deal);
      const detail =
         state === 'waiting'
            ? t('ждём заявителя')
            : dueText(t, { dueDate: triageDue(deal) });
      return {
         label: `${label} · ${detail}`,
         tone: (state === 'overdue' ? 'danger' : 'neutral') as Tone,
      };
   }
   const deadline = getDeadline(deal);
   if (deadline.kind === 'none')
      return { label, tone: STATUS_TONES[deal.status] };
   const detail =
      deadline.kind === 'committee'
         ? t('заседание {{date}}', { date: formatDate(deadline.date) })
         : deadlineLabel(t, deadline).toLowerCase();
   return { label: `${label} · ${detail}`, tone: deadlineTone(deadline) };
};

// "B2B SaaS · сайт": the industry and what else tells the deal apart.
export const dealLine = (t: T, deal: Deal) =>
   [
      deal.industry,
      deal.tags || t(SOURCE_LABELS[deal.source]).toLowerCase(),
   ].join(' · ');

// The last column of the register: what comes next, or how the deal ended.
export const outcomeOf = (t: T, deal: Deal) => {
   const { status, closed } = deal;
   if (status === 'rejected' && closed?.reason)
      return {
         text: `${t(REJECT_REASON_LABELS[closed.reason])} · ${formatDate(closed.date)}`,
         late: false,
      };
   if (status === 'withdrawn' && closed)
      return {
         text: `${closed.note} · ${formatDate(closed.date)}`,
         late: false,
      };
   if (status === 'paused') return { text: closed?.note ?? '', late: false };
   if (status === 'review')
      return {
         text: `${nextTitle(t, deal)} — ${dueText(t, { dueDate: triageDue(deal) })}`,
         late: isLate(deal),
      };
   if (!deal.next) return { text: '', late: false };
   return {
      text: `${nextTitle(t, deal)} — ${dueText(t, deal.next)}`,
      late: isLate(deal),
   };
};

// ---- mandate check of an incoming application

export type MandateState = 'ok' | 'attention' | 'fail';

export interface MandateCheck {
   rows: { key: string; label: string; value: string; state: MandateState }[];
   verdict: { label: string; state: MandateState };
}

const MANDATE_TONES: Record<MandateState, Tone> = {
   ok: 'success',
   attention: 'warning',
   fail: 'danger',
};

export const mandateTone = (state: MandateState) => MANDATE_TONES[state];

// Applies the published mandate. It does not judge the project, only whether
// the application fits the rules.
export const checkMandate = (
   t: T,
   deal: Deal,
   language: string,
): MandateCheck => {
   const amount = (value: number) => formatAmount(value, language);
   const { minCheck, maxCheck } = mandateLimits();
   const industry = deal.industry.trim().toLowerCase();
   const excluded = MANDATE.excluded.includes(industry);
   const licensed = MANDATE.licensed.includes(industry);
   const tooHigh = deal.amount > maxCheck;
   const tooLow = deal.amount < minCheck;
   const stageFits = MANDATE.stages.includes(deal.roundStage);
   const stage = ROUND_STAGE_NAMES[deal.roundStage];
   const range = `$${minCheck / 1000}–${maxCheck / 1000}K`;

   const check = () => {
      if (tooHigh)
         return t('{{amount}} — выше {{limit}}', {
            amount: amount(deal.amount),
            limit: amount(maxCheck),
         });
      if (tooLow)
         return t('{{amount}} — ниже {{limit}}', {
            amount: amount(deal.amount),
            limit: amount(minCheck),
         });
      return t('{{amount}} в пределах {{range}}', {
         amount: amount(deal.amount),
         range,
      });
   };

   const verdict = (): MandateCheck['verdict'] => {
      if (excluded) return { label: t('Исключённая отрасль'), state: 'fail' };
      if (tooHigh)
         return {
            label: t('Чек выше {{limit}}', { limit: amount(maxCheck) }),
            state: 'fail',
         };
      if (tooLow)
         return {
            label: t('Чек ниже {{limit}}', { limit: amount(minCheck) }),
            state: 'attention',
         };
      if (!stageFits)
         return {
            label: t('Стадия: {{stage}}', { stage }),
            state: 'attention',
         };
      if (licensed)
         return { label: t('Нужна лицензия ЦБ'), state: 'attention' };
      return { label: t('Соответствует'), state: 'ok' };
   };

   return {
      rows: [
         {
            key: 'country',
            label: t('География'),
            value: deal.country,
            state: 'ok',
         },
         {
            key: 'stage',
            label: t('Стадия'),
            value: stage,
            state: stageFits ? 'ok' : 'attention',
         },
         {
            key: 'check',
            label: t('Чек'),
            value: check(),
            state: tooHigh ? 'fail' : tooLow ? 'attention' : 'ok',
         },
         {
            key: 'industry',
            label: t('Отрасль'),
            value: licensed
               ? t('{{industry}} — нужна лицензия ЦБ', {
                    industry: deal.industry,
                 })
               : excluded
                 ? deal.industry
                 : t('{{industry}} — в фокусе', { industry: deal.industry }),
            state: licensed ? 'attention' : 'ok',
         },
         {
            key: 'excluded',
            label: t('Исключения'),
            value: excluded ? t('исключённая отрасль') : t('не найдены'),
            state: excluded ? 'fail' : 'ok',
         },
      ],
      verdict: verdict(),
   };
};

// ---- a deal's card

// A criterion counts once it has both a score and the reasons for it.
export const isScored = ({ score, rationale }: Criterion) =>
   score !== null && !!rationale.trim();

// What has to be true before a deal leaves its stage. A stage may have its
// own list; screening always asks for the full score and a second opinion.
export const exitConditions = (t: T, deal: Deal): CheckItem[] => {
   if (deal.exit) return deal.exit;
   if (deal.stage !== 'screening') return [];
   const scored = (deal.screening?.criteria ?? []).filter(isScored).length;
   const secondId = deal.screening?.secondId ?? '';
   return [
      {
         id: 'score',
         text: t('Оценка по 7 критериям заполнена'),
         note: t('заполнено {{done}} из {{total}}', {
            done: scored,
            total: CRITERIA.length,
         }),
         state: scored === CRITERIA.length ? 'done' : 'blocking',
      },
      {
         id: 'second',
         text: t('Решение подтверждает второй сотрудник'),
         note: secondId ? personName(secondId) : t('не выбран'),
         state: secondId ? 'done' : 'blocking',
      },
   ];
};

// What the counters next to the card's tabs show.
export const tabCounts = (deal: Deal) => {
   const openStreams = (deal.workstreams ?? []).filter(
      ({ status }) => status !== 'done',
   ).length;
   return {
      requests: deal.totals?.requests ?? deal.requests?.length ?? 0,
      // what is still open in DD: its workstreams, then the risks they left
      dd: openStreams || (deal.risks?.length ?? 0),
      decisions: deal.decisions?.length ?? 0,
   };
};

// The path of a deal the sample has no log for: stages passed, the current
// one with its clock, and the norms of those ahead.
export const defaultPath = (t: T, deal: Deal): PathStep[] => {
   const current = STAGES.indexOf(deal.stage);
   return STAGES.map((stage, index) => {
      const norm = stageNorm(stage);
      const normLine = norm
         ? t('норма {{days}} р.д.', { days: norm })
         : t('по графику заседаний');
      if (index === 0)
         return {
            stage,
            line1: formatDay(dayOf(deal.receivedAt)),
            line2: index === current ? normLine : '',
         };
      if (index < current) return { stage, line1: t('пройдена'), line2: '' };
      if (index === current && deal.days)
         return {
            stage,
            line1: deal.waiting ? t('ждём заявителя') : t('идёт сейчас'),
            line2: t('{{used}} из {{norm}} р.д.', deal.days),
         };
      return { stage, line1: normLine, line2: '' };
   });
};

export const pathState = (deal: Deal, stage: DealStage) => {
   if (deal.status === 'portfolio') return 'done';
   const current = STAGES.indexOf(deal.stage);
   const index = STAGES.indexOf(stage);
   if (index < current) return 'done';
   return index === current ? 'current' : 'ahead';
};

// ---- the register
