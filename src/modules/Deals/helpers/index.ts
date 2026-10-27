import { INSTRUMENT_LABELS } from '@modules/Portfolio/constants';
import {
   addWorkingDays,
   formatDate,
   formatDay,
   formatUsd,
   downloadCsv,
   personName,
   todayISO,
   workingDaysBetween,
} from '@shared/helpers';
import type { FactRow } from '@shared/components';
import type {
   CheckItem,
   Criterion,
   Deal,
   Fact,
   JournalEntry,
   PathStep,
   TeamMember,
   Tone,
} from '@shared/types/deals.types';
import dayjs from 'dayjs';
import type { DealStage, Task } from '@shared/types/work.types';
import type { TFunction } from 'i18next';
import {
   currentSettings,
   itemOf,
   stageItem,
   stageName,
   stagesOf,
   listName,
   nameOf,
   parseCheck,
   parseNorm,
} from '@modules/Settings/services';
import {
   APPLICATION_PHRASES,
   CLOSED_STATUSES,
   CONDITION_ORIGIN,
   CONDITION_STAGES,
   CRITERIA,
   MANDATE,
   STAGE_HOW,
   STAGE_NEXT_LABELS,
   STAGE_NORMS,
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

export { downloadCsv, personName, stageName };

// ---- the stages, as Настройки → Этапы и нормативы order them

export const stageKeys = () => stagesOf().map(({ key }) => key);

// The funnel's columns: every stage after Входящие.
export const funnelStages = () =>
   stageKeys().filter((stage) => stage !== 'inbox');

// The stage after this one; null after the last (the deal joins the portfolio).
export const nextStageOf = (stage: DealStage): DealStage | null => {
   const keys = stageKeys();
   const index = keys.indexOf(stage);
   return index === keys.length - 1 ? null : (keys[index + 1] ?? null);
};

// What a deal on the stage does next, as its card's «Следующий шаг» says.
export const stageNextLabel = (t: T, stage: DealStage) => {
   const label = STAGE_NEXT_LABELS[stage as keyof typeof STAGE_NEXT_LABELS];
   return label ? t(label) : stageName(stage);
};

// How the owner works the stage and moves the deal on from it.
export const stageHowText = (t: T, stage: DealStage) => {
   const next = nextStageOf(stage);
   const values = { next: next ? stageName(next) : t('Портфель') };
   const how = STAGE_HOW[stage as keyof typeof STAGE_HOW];
   return how
      ? t(how, values)
      : t(
           'Сделайте работу этапа «{{stage}}». Затем — «Перевести в «{{next}}»».',
           { ...values, stage: stageName(stage) },
        );
};

// The check range of the mandate, as Настройки have it now.
export const mandateLimits = () => {
   const range = parseCheck(currentSettings()?.mandate.check ?? '');
   return range
      ? { minCheck: range[0], maxCheck: range[1] }
      : { minCheck: MANDATE.minCheck, maxCheck: MANDATE.maxCheck };
};

// Working days a deal may stay on a stage: from Настройки where they give a
// number, otherwise the stage's own rule (none for the fund's own stages).
export const stageNorm = (stage: DealStage) => {
   const item = stageItem(stage);
   return (item && parseNorm(item.norm)) || STAGE_NORMS[stage] || null;
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
   deal.next?.title || stageNextLabel(t, deal.stage);

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
      ? { label: stageName(deal.stage), tone: 'accent' as Tone }
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

// ---- names from Настройки's lists, in the interface language

// The niche the analyst wrote, or else the sector.
export const industryText = (deal: Deal) =>
   deal.industry || listName('industries', deal.industryKey);

export const roundText = (deal: Deal) => listName('rounds', deal.roundStage);

export const countryText = (deal: Deal) => listName('countries', deal.country);

export const sourceText = (deal: Deal) => listName('sources', deal.source);

export const reasonText = (reason: string) => listName('reasons', reason);

/* What a line of a deal's journal records, in the interface language,
   without who did it (journalAuthor). An entry without an employee came from
   the applicant: the website's application, or an answer or a document from
   the startup cabinet. */
export const journalAction = (t: T, entry: JournalEntry) => {
   switch (entry.kind) {
      case 'text':
         return entry.text;
      case 'created':
         return entry.userId
            ? t('Заявка добавлена вручную')
            : t('Заявка с сайта');
      case 'taken':
         return t('Взята в скрининг');
      case 'stage':
         return entry.stage === 'portfolio'
            ? t('Переведена в портфель')
            : t('Переведена в стадию «{{stage}}»', {
                 stage: stageName(entry.stage),
              });
      case 'rejected':
         return t('Отказ: {{reason}}', {
            reason: reasonText(entry.reason).toLowerCase(),
         });
      case 'request':
         return t('Запрос заявителю: {{title}}', { title: entry.title });
      case 'answered':
         return entry.userId
            ? t('Ответ заявителя записан: {{title}}', { title: entry.title })
            : t('Заявитель ответил на запрос в кабинете: {{title}}', {
                 title: entry.title,
              });
      case 'document': {
         const params = { title: entry.title };
         if (entry.result === 'accepted')
            return t('Документ принят: {{title}}', params);
         if (entry.result === 'rejected')
            return t('Документ отклонён: {{title}}', params);
         if (!entry.userId)
            return t(
               'Заявитель загрузил документ в кабинете: {{title}}',
               params,
            );
         return t('Документ загружен от имени фонда: {{title}}', params);
      }
      case 'screening':
         return t('Скрининг завершён');
      case 'memo':
         return t('Меморандум утверждён спонсором');
      case 'approved':
         return t('Директор одобрил переход');
      case 'edited':
         return t('Данные сделки изменены');
      case 'moved': {
         // the founder withdrew the application in the startup cabinet
         if (!entry.userId && entry.status === 'withdrawn')
            return entry.reason
               ? t('Заявитель отозвал заявку в кабинете: {{reason}}', {
                    reason: entry.reason,
                 })
               : t('Заявитель отозвал заявку в кабинете');
         const moved = {
            stage: stageName(entry.stage),
            status: t(STATUS_LABELS[entry.status]).toLowerCase(),
            reason: entry.reason,
         };
         // the reason is written only when one was given
         return entry.reason
            ? t('Вручную: «{{stage}}», {{status}} — {{reason}}', moved)
            : t('Вручную: «{{stage}}», {{status}}', moved);
      }
      case 'workstream':
         return entry.handed
            ? t('Направление DD передано исполнителю: {{name}}', {
                 name: entry.name,
              })
            : t('Добавлено направление DD: {{name}}', { name: entry.name });
   }
};

// The employee who made a journal entry; '' — the applicant, or nobody.
export const journalAuthor = (entry: JournalEntry) =>
   'userId' in entry ? entry.userId : '';

// A journal line as History shows it: what happened · who did it.
export const journalText = (t: T, entry: JournalEntry) => {
   const author = journalAuthor(entry);
   const action = journalAction(t, entry);
   return author ? `${action} · ${personName(author)}` : action;
};

// "с сайта" or "нетворк", as in "SQBV-2026-0172 · с сайта · 2 октября".
export const sourceFrom = (t: T, deal: Deal) =>
   deal.fromSite ? t('с сайта') : sourceText(deal).toLowerCase();

// "Сайт · Telegram": the website's form and how the founder heard of the
// fund, or the fund's own channel.
export const sourceLine = (t: T, deal: Deal) =>
   [deal.fromSite && t('Сайт'), sourceText(deal)].filter(Boolean).join(' · ');

// "B2B SaaS · сайт": the industry and what else tells the deal apart.
export const dealLine = (t: T, deal: Deal) =>
   [industryText(deal), deal.tags || sourceFrom(t, deal)]
      .filter(Boolean)
      .join(' · ');

// The last column of the register: what comes next, or how the deal ended.
export const outcomeOf = (t: T, deal: Deal) => {
   const { status, closed } = deal;
   if (status === 'rejected' && closed?.reason)
      return {
         text: `${reasonText(closed.reason)} · ${formatDate(closed.date)}`,
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

// ---- what the application said

type ApplicationPhrase = (typeof APPLICATION_PHRASES)[number];

const isApplicationPhrase = (text: string): text is ApplicationPhrase =>
   APPLICATION_PHRASES.some((phrase) => phrase === text);

// A phrase the website writes, in the interface language; the applicant's
// own words as they are.
export const applicationText = (t: T, text: string) =>
   isApplicationPhrase(text) ? t(text) : text;

// «Из заявки» as rows of a FactList.
export const factRows = (t: T, facts: Fact[]) =>
   facts.map(([label, value, note]) => ({
      label: applicationText(t, label),
      value: applicationText(t, value),
      note,
   }));

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

// Applies the published mandate: the check range of Настройки, and the
// marks on its lists — the rounds and countries in the mandate, and each
// industry's place in it. It does not judge the project, only whether the
// application fits the rules.
export const checkMandate = (
   t: T,
   deal: Deal,
   language: string,
): MandateCheck => {
   const amount = (value: number) => formatAmount(value, language);
   const { minCheck, maxCheck } = mandateLimits();
   const sector = itemOf('industries', deal.industryKey);
   const round = itemOf('rounds', deal.roundStage);
   const country = itemOf('countries', deal.country);
   const industry = industryText(deal) || t('не указана');
   const excluded = sector?.mandate === 'excluded';
   const licensed = sector?.mandate === 'licensed';
   const tooHigh = deal.amount > maxCheck;
   const tooLow = deal.amount < minCheck;
   const stageFits = Boolean(round?.inMandate);
   const placeFits = Boolean(country?.inMandate);
   const stage = round ? nameOf(round) : deal.roundStage || t('не указана');
   const place = country ? nameOf(country) : deal.country || t('не указана');
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

   const sectorText = () => {
      if (!sector) return t('{{industry}} — отрасль не выбрана', { industry });
      if (licensed) return t('{{industry}} — нужна лицензия ЦБ', { industry });
      if (excluded) return industry;
      if (sector.mandate === 'focus')
         return t('{{industry}} — в фокусе', { industry });
      return t('{{industry}} — допустима', { industry });
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
      if (!placeFits)
         return {
            label: t('География: {{country}}', { country: place }),
            state: 'attention',
         };
      if (licensed)
         return { label: t('Нужна лицензия ЦБ'), state: 'attention' };
      if (!sector) return { label: t('Выберите отрасль'), state: 'attention' };
      return { label: t('Соответствует'), state: 'ok' };
   };

   return {
      rows: [
         {
            key: 'country',
            label: t('География'),
            // a deal from before the country was asked has none: unknown, not outside
            value:
               placeFits || !deal.country
                  ? place
                  : t('{{country}} — вне географии мандата', {
                       country: place,
                    }),
            state: placeFits ? 'ok' : 'attention',
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
            value: sectorText(),
            state: licensed || !sector ? 'attention' : 'ok',
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

// The stages a committee decides on.
export const COMMITTEE_STAGES: DealStage[] = ['ic1', 'ic2', 'board'];

// A committee stage ends with the committee's approval. A refusal does not
// reject the deal by itself: the owner rejects it with a reason.
const committeeCondition = (t: T, deal: Deal): CheckItem => {
   const decisions = (deal.decisions ?? []).filter(
      ({ stage }) => stage === deal.stage,
   );
   const approval = decisions.find(({ verdict }) => verdict === 'approved');
   const refused = decisions.some(({ verdict }) => verdict === 'rejected');
   const note = () => {
      if (approval) return approval.detail;
      if (refused) return t('Комитет отказал — откажите сделке с причиной');
      return t('Решения пока нет — вынесите сделку на заседание');
   };
   return {
      id: 'committee',
      text: t('Получить одобрение: {{body}}', {
         body: stageName(deal.stage),
      }),
      note: note(),
      state: approval ? 'done' : 'blocking',
   };
};

// What has to be true before a deal leaves its stage: on screening, the full
// score and a second opinion; on a committee stage, the committee's approval;
// and whatever list the stage has of its own.
// After ИК-2 the director approves the investment too; an approval counts
// for the stage it was given on, so it is looked for since the deal entered it.
const directorCondition = (t: T, deal: Deal): CheckItem => {
   const entered = deal.journal.findIndex(
      ({ kind }) => kind === 'stage' || kind === 'taken',
   );
   const approval = (
      entered === -1 ? deal.journal : deal.journal.slice(0, entered)
   ).find((entry) => entry.kind === 'approved');
   return {
      id: 'director',
      text: t('Получить одобрение директора'),
      note:
         approval && 'userId' in approval
            ? t('{{name}}, {{date}}', {
                 name: personName(approval.userId),
                 date: formatDate(approval.date),
              })
            : t('Директор подтверждает инвестицию после решения ИК-2'),
      state: approval ? 'done' : 'blocking',
   };
};

// The tasks a committee's approvals gave the deal's owner.
export const conditionTasks = (deal: Deal, tasks: Task[]) =>
   tasks.filter(
      ({ origin, relationId }) =>
         origin === CONDITION_ORIGIN && relationId === deal.id,
   );

// On DD the conditions of ИК-1 are met, on Закрытие those of ИК-2 and the
// board: the tasks due by the event the deal goes to next.
const conditionsCondition = (t: T, deal: Deal, tasks: Task[]): CheckItem[] => {
   const due = CONDITION_STAGES[deal.stage];
   const own = conditionTasks(deal, tasks).filter(
      ({ dueLabel }) => dueLabel === due,
   );
   if (!own.length) return [];
   const open = own.filter(({ status }) => status !== 'done').length;
   return [
      {
         id: 'conditions',
         text:
            deal.stage === 'dd'
               ? t('Выполнить условия ИК-1')
               : t('Выполнить условия ИК-2 и Набсовета'),
         note: open
            ? t('открыто {{open}} из {{total}} — задачи в «Задачах»', {
                 open,
                 total: own.length,
              })
            : t('все выполнены'),
         state: open ? 'blocking' : 'done',
      },
   ];
};

/* `tasks`: the task list, for the conditions of the committee's approvals;
   without it they are not checked. */
export const exitConditions = (
   t: T,
   deal: Deal,
   tasks: Task[] = [],
): CheckItem[] => {
   const own = deal.exit ?? [];
   if (COMMITTEE_STAGES.includes(deal.stage))
      return [
         committeeCondition(t, deal),
         ...(deal.stage === 'ic2' ? [directorCondition(t, deal)] : []),
         ...own,
      ];
   if (CONDITION_STAGES[deal.stage])
      return [...conditionsCondition(t, deal, tasks), ...own];
   if (deal.stage !== 'screening' || deal.exit) return own;
   const scored = (deal.screening?.criteria ?? []).filter(isScored).length;
   const secondId = deal.screening?.secondId ?? '';
   return [
      {
         id: 'score',
         text: t('Оценить стартап по 7 критериям'),
         note: t('заполнено {{done}} из {{total}}', {
            done: scored,
            total: CRITERIA.length,
         }),
         state: scored === CRITERIA.length ? 'done' : 'blocking',
      },
      {
         id: 'second',
         text: t('Выбрать коллегу, который проверит оценку'),
         note: secondId ? personName(secondId) : t('не выбран'),
         state: secondId ? 'done' : 'blocking',
      },
   ];
};

// Where a committee stage stands: the committee's word, or the meeting the
// deal waits for.
export const committeeStateOf = (deal: Deal) => {
   const decisions = (deal.decisions ?? []).filter(
      ({ stage }) => stage === deal.stage,
   );
   if (decisions.some(({ verdict }) => verdict === 'approved'))
      return 'approved';
   if (decisions.some(({ verdict }) => verdict === 'rejected'))
      return 'rejected';
   // the meeting the deal was put on has met and put the question off
   if (
      deal.committee &&
      decisions.some(({ meetingId }) => meetingId === deal.committee?.id)
   )
      return 'postponed';
   return deal.committee ? 'scheduled' : 'none';
};

interface NextStepInfo {
   title: string;
   text: string;
   ready?: string; // the move the deal is ready for, as its button says
}

/* The card's «Следующий шаг»: what to do now and how, from where the deal
   stands rather than from its stage alone. On a committee stage that is the
   meeting, then the committee's word, then the move; on the others, the
   stage's own work. */
export const nextStepOf = (
   t: T,
   deal: Deal,
   tasks: Task[] = [],
): NextStepInfo => {
   if (deal.status === 'portfolio')
      return {
         title: t('Сделка закрыта — компания в портфеле'),
         text: t(
            'Дальше компанию ведёт «Портфель»: квартальные отчёты, пилоты, запросы компании.',
         ),
      };
   if (deal.status === 'review')
      return { title: nextTitle(t, deal), text: t(STAGE_HOW.inbox) };
   if (deal.status !== 'active') return { title: nextTitle(t, deal), text: '' };
   const target = nextStageOf(deal.stage);
   const move = target
      ? t('Перевести в «{{stage}}»', { stage: stageName(target) })
      : t('Перевести в портфель');
   const exit = exitConditions(t, deal, tasks);
   const blocking = exit.filter(({ state }) => state !== 'done');
   if (!COMMITTEE_STAGES.includes(deal.stage))
      return {
         title: deal.next?.title || stageNextLabel(t, deal.stage),
         text: stageHowText(t, deal.stage),
         // a stage with conditions is ready once they are met; on the others
         // the owner judges when the work is done
         ...(exit.length > 0 && blocking.length === 0 && { ready: move }),
      };
   const body = stageName(deal.stage);
   switch (committeeStateOf(deal)) {
      case 'rejected':
         return {
            title: t('{{body}}: отказ', { body }),
            text: t(
               'Решение комитета не закрывает сделку само: нажмите «Отказать с причиной».',
            ),
         };
      case 'approved':
         return blocking.some(({ id }) => id === 'director')
            ? {
                 title: t('Одобрение директора'),
                 text: t(
                    'ИК-2 одобрил инвестицию. Директор подтверждает её в окне «{{move}}» кнопкой «Одобряю».',
                    { move },
                 ),
              }
            : {
                 title: move,
                 text: t(
                    '{{body}} одобрил сделку — переведите её на следующую стадию.',
                    { body },
                 ),
                 ready: move,
              };
      case 'postponed':
         return {
            title: t('{{body}}: решение отложено', { body }),
            text: t(
               'Когда будет готово то, чего ждал комитет, вынесите сделку на следующее заседание.',
            ),
         };
      case 'scheduled':
         return {
            title: t('Ждём решения: {{body}}', { body }),
            text: t(
               'Сделка в повестке. Секретарь проводит заседание и записывает голоса; решение придёт в карточку из протокола.',
            ),
         };
      default:
         return {
            title: t('Вынести на «{{body}}»', { body }),
            text: t(
               'Назначьте заседание или добавьте сделку в повестку уже назначенного.',
            ),
         };
   }
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

// 11–14 окт; one day for a stage passed within it
const spanText = (from: string, to: string) => {
   if (!to || from === to) return formatDay(from);
   return dayjs(from).isSame(to, 'month')
      ? `${dayjs(from).format('D')}–${formatDay(to)}`
      : `${formatDay(from)} – ${formatDay(to)}`;
};

const approvalOf = (deal: Deal, stage: DealStage) =>
   deal.decisions?.find(
      (decision) => decision.stage === stage && decision.verdict === 'approved',
   );

// Where a committee stage the deal is on stands, under its name on the path.
const committeeLine = (t: T, deal: Deal) => {
   const state = committeeStateOf(deal);
   if (state === 'approved') return t('одобрено');
   if (state === 'rejected') return t('отказ');
   if (state === 'scheduled' && deal.committee)
      return t(
         deal.stage === 'board'
            ? 'НС № {{number}} · {{date}}'
            : 'ИК № {{number}} · {{date}}',
         {
            number: deal.committee.number,
            date: formatDay(deal.committee.date),
         },
      );
   return t('по графику заседаний');
};

/* The path from the deal's stage history: when each stage passed was on, in
   how many working days against its norm, and the meeting that approved a
   committee stage; the current one since when and its clock; the norms of
   those ahead. A deal from before the history shows its stages as passed. */
export const defaultPath = (t: T, deal: Deal): PathStep[] => {
   const keys = stageKeys();
   // a deal in the portfolio has passed them all
   const current =
      deal.status === 'portfolio' ? keys.length : keys.indexOf(deal.stage);
   return keys.map((stage, index) => {
      const norm = stageNorm(stage);
      const normLine = norm
         ? t('норма {{days}} р.д.', { days: norm })
         : t('по графику заседаний');
      const record = deal.stages?.filter((item) => item.stage === stage).at(-1);
      if (index < current) {
         const approval = approvalOf(deal, stage);
         const days =
            record?.daysUsed != null && record.norm
               ? t('{{used}} из {{norm}} р.д.', {
                    used: record.daysUsed,
                    norm: record.norm,
                 })
               : '';
         return {
            stage,
            line1: record
               ? spanText(record.enteredAt, record.leftAt)
               : index === 0
                 ? formatDay(dayOf(deal.receivedAt))
                 : t('пройдена'),
            line2: approval
               ? [approval.meetingLabel, t('одобрено')]
                    .filter(Boolean)
                    .join(' · ')
               : days,
            late: record?.late,
         };
      }
      if (index === current) {
         const since =
            index === 0
               ? formatDay(dayOf(deal.receivedAt))
               : record &&
                 t('с {{date}}', { date: formatDay(record.enteredAt) });
         return {
            stage,
            line1: deal.waiting
               ? t('ждём заявителя')
               : since || t('идёт сейчас'),
            line2: COMMITTEE_STAGES.includes(stage)
               ? committeeLine(t, deal)
               : deal.days
                 ? t('{{used}} из {{norm}} р.д.', deal.days)
                 : normLine,
         };
      }
      return { stage, line1: normLine, line2: '' };
   });
};

// "в работе 12 рабочих дней · из них 3 на паузе"; how long the path took for
// a deal in the portfolio.
export const pathHintOf = (t: T, deal: Deal) => {
   const start = dayOf(deal.receivedAt);
   if (deal.status === 'portfolio') {
      const end = deal.stages?.find(({ stage }) => stage === 'portfolio');
      return end
         ? t('путь занял {{count}} рабочий день', {
              count: workingDaysBetween(start, end.enteredAt),
           })
         : undefined;
   }
   if (deal.status !== 'active') return undefined;
   const paused = deal.clock?.pausedDays ?? 0;
   return [
      t('в работе {{count}} рабочий день', {
         count: workingDaysBetween(start, todayISO()),
      }),
      paused > 0 && t('из них {{count}} на паузе', { count: paused }),
   ]
      .filter(Boolean)
      .join(' · ');
};

export const pathState = (deal: Deal, stage: DealStage) => {
   if (deal.status === 'portfolio') return 'done';
   const keys = stageKeys();
   const current = keys.indexOf(deal.stage);
   const index = keys.indexOf(stage);
   if (index < current) return 'done';
   return index === current ? 'current' : 'ahead';
};

// ---- the register

// ---- the card's sections

// The stages on which the deal's terms, metrics, risks and synergy are kept:
// from the first committee on, once there is something to put to it.
export const TERMS_STAGES: DealStage[] = [
   'ic1',
   'dd',
   'ic2',
   'board',
   'closing',
];

export const hasTermsStage = (deal: Deal) =>
   deal.status === 'portfolio' || TERMS_STAGES.includes(deal.stage);

// SAFE, Доля
export const instrumentText = (t: T, deal: Deal) =>
   deal.terms?.instrument ? t(INSTRUMENT_LABELS[deal.terms.instrument]) : '';

// «Условия сделки» as label–value rows, each only once it is written.
export const termsRows = (t: T, deal: Deal, language: string): FactRow[] => {
   const terms = deal.terms;
   if (!terms) return [];
   const usd = (value: number) => formatUsd(value, language);
   const instrument = instrumentText(t, deal);
   const share =
      terms.roundSize && deal.amount
         ? Math.round((deal.amount / terms.roundSize) * 100)
         : null;
   const post =
      terms.preMoney && terms.roundSize ? terms.preMoney + terms.roundSize : 0;
   const rows: (FactRow | false)[] = [
      !!instrument && {
         label: t('Инструмент'),
         value: [instrument, roundText(deal)].filter(Boolean).join(' · '),
      },
      {
         label: t('Раунд'),
         value: [
            terms.roundSize && usd(terms.roundSize),
            t('чек фонда {{amount}}', { amount: usd(deal.amount) }),
            share !== null && t('{{pct}}% раунда', { pct: share }),
         ]
            .filter(Boolean)
            .join(' · '),
      },
      !!terms.conditions && {
         label: instrument
            ? t('Условия {{instrument}}', { instrument })
            : t('Условия'),
         value: terms.conditions,
      },
      !!terms.preMoney && {
         label: t('Оценка компании'),
         value: t('{{amount}} pre-money', { amount: usd(terms.preMoney) }),
         note:
            post > 0
               ? t('доля фонда ≈ {{pct}}% post-money', {
                    pct: new Intl.NumberFormat(language, {
                       maximumFractionDigits: 1,
                    }).format((deal.amount / post) * 100),
                 })
               : undefined,
      },
      !!terms.valuation && { label: t('Оценка по DD'), value: terms.valuation },
      !!terms.structure && { label: t('Структура'), value: terms.structure },
      !!terms.founder && { label: t('Основатель'), value: terms.founder },
   ];
   return rows.filter((row): row is FactRow => !!row);
};

// What the committee is asked to approve: "$300 000 · SAFE · раунд $1 000 000".
export const proposalText = (t: T, deal: Deal, language: string) => {
   const amount = formatUsd(deal.amount, language);
   const instrument = instrumentText(t, deal);
   if (!instrument) return t('{{amount}} — запрос компании', { amount });
   return [
      amount,
      instrument,
      deal.terms?.roundSize &&
         t('раунд {{amount}}', {
            amount: formatUsd(deal.terms.roundSize, language),
         }),
   ]
      .filter(Boolean)
      .join(' · ');
};

const WORKSTREAM_STATES = {
   done: 'done',
   in_progress: 'waiting',
   rework: 'attention',
   not_started: 'open',
} as const;

/* The materials a deal needs for the committee of its stage, as the panel
   sees them: the decision before, the memorandum, the terms, DD's
   conclusions, the company's answers and documents; then the items the owner
   added. Each closes here when the work behind it is done, and the
   materials go to the members once all are closed. [] off a committee stage. */
export const readinessOf = (t: T, deal: Deal): CheckItem[] => {
   if (!COMMITTEE_STAGES.includes(deal.stage)) return [];
   const items: CheckItem[] = [];
   const before =
      deal.stage === 'ic2' ? 'ic1' : deal.stage === 'board' ? 'ic2' : null;
   if (before) {
      const approval = approvalOf(deal, before);
      items.push({
         id: 'decision',
         text: t('Решение {{body}}', { body: stageName(before) }),
         note: approval?.detail || t('решения нет'),
         state: approval ? 'done' : 'blocking',
      });
   }
   if (deal.memo)
      items.push({
         id: 'memo',
         text: t('Меморандум, утверждённый спонсором'),
         note: deal.memo.approvedAt
            ? t('v{{version}} · {{name}}, {{date}}', {
                 version: deal.memo.version,
                 name: personName(deal.memo.sponsorId),
                 date: formatDate(deal.memo.approvedAt),
              })
            : t('v{{version}} · ждёт утверждения спонсора', {
                 version: deal.memo.version,
              }),
         state: deal.memo.approvedAt ? 'done' : 'attention',
      });
   if (deal.stage !== 'ic1') {
      const ready = !!deal.terms?.instrument && !!deal.terms.roundSize;
      items.push({
         id: 'terms',
         text: t('Условия сделки'),
         note: ready
            ? proposalText(t, deal, 'ru')
            : t('внесите инструмент и размер раунда'),
         state: ready ? 'done' : 'open',
      });
      for (const stream of deal.workstreams ?? [])
         items.push({
            id: `stream-${stream.id}`,
            text: t('{{name}} — вывод', { name: stream.name }),
            note:
               stream.status === 'done'
                  ? stream.executor
                  : stream.status === 'not_started'
                    ? t('не передано исполнителю')
                    : stream.status === 'rework'
                      ? t('на доработке')
                      : t('у исполнителя до {{date}}', {
                           date: formatDate(stream.dueDate),
                        }),
            state: WORKSTREAM_STATES[stream.status],
         });
   }
   for (const request of deal.requests ?? [])
      if (request.status === 'waiting')
         items.push({
            id: `request-${request.id}`,
            text: t('Ответ компании: {{title}}', { title: request.title }),
            note: t('запрошено {{date}} · ждём', {
               date: formatDate(request.sentAt),
            }),
            state: 'waiting',
         });
      else if (request.status === 'answered')
         // the founder answered in the cabinet: the fund checks it
         items.push({
            id: `request-${request.id}`,
            text: t('Ответ компании: {{title}}', { title: request.title }),
            note: t('ответ получен {{date}} · проверьте', {
               date: formatDate(request.closedAt),
            }),
            state: 'attention',
         });
   for (const document of deal.documents ?? [])
      if (document.status !== 'accepted')
         items.push({
            id: `document-${document.id}`,
            text: t('Документ: {{title}}', { title: document.title }),
            note:
               document.status === 'review'
                  ? t('на проверке у фонда')
                  : document.status === 'rejected'
                    ? t('отклонён — ждём новую версию')
                    : t('не загружен'),
            state: document.status === 'review' ? 'attention' : 'waiting',
         });
   return [...items, ...(deal.readiness?.items ?? [])];
};

/* Who works on the deal: its owner, the memorandum's sponsor, the colleague
   who checked the screening and DD's outside executors, each from the deal
   itself; then the people the owner added. */
export const teamOf = (t: T, deal: Deal): TeamMember[] => {
   const roles = new Map<string, string[]>();
   const add = (employeeId: string | undefined, role: string) => {
      if (employeeId)
         roles.set(employeeId, [...(roles.get(employeeId) ?? []), role]);
   };
   add(deal.ownerId, t('Владелец'));
   add(deal.memo?.sponsorId, t('Спонсор'));
   add(deal.screening?.secondId, t('Второй оценщик скрининга'));
   return [
      ...[...roles].map(([employeeId, list]) => ({
         employeeId,
         role: list.join(' · '),
      })),
      ...(deal.team ?? []),
      ...(deal.workstreams ?? [])
         .filter(({ executor, handedAt }) => executor && handedAt)
         // "ООО «ABACUS» · договор № 22/26": who, then on what grounds
         .map(({ name, executor }) => {
            const [who, ...grounds] = executor.split(' · ');
            return { name: who, role: [name, ...grounds].join(' · ') };
         }),
   ];
};
