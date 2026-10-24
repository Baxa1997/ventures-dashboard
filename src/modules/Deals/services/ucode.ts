import { OUTCOMES } from '@modules/Committee/constants';
import {
   itemOf,
   listIdOf,
   listKeyOf,
   listOf,
} from '@modules/Settings/services';
import {
   createRow,
   deleteRow,
   fileUrl,
   fromJson,
   listRows,
   numOrNull,
   toJson,
   updateRow,
   type Row,
} from '@shared/api/ucode';
import { todayISO } from '@shared/helpers';
import type {
   CheckItem,
   Deal,
   DealDocument,
   DealFolder,
   DealRequest,
   DealsSummary,
   DealStatus,
   DealTerms,
   Decision,
   Fact,
   JournalEntry,
   Memo,
   RejectReason,
   Risk,
   Screening,
   StageRecord,
   TeamMember,
   Workstream,
} from '@shared/types/deals.types';
import type { Instrument } from '@shared/types/portfolio.types';
import type { DealStage } from '@shared/types/work.types';
import dayjs from 'dayjs';
import { CRITERIA } from '../constants';
import { stageKeys } from '../helpers';

/* Сделки in ucode (docs/ucode-migration.md, batch 2): each deal row with its
   children read into the panel's Deal, and what a change touched written back.
   The logic of the moves stays in ./index.ts; this file only stores. The rows
   keep the panel's ids, so a journal entry or a request made in the panel is
   created in ucode under the same id. A deal from the website points to its
   application, whose public status and resubmit date follow the deal. */

const STATUSES: DealStatus[] = ['review', 'active', 'paused', 'portfolio', 'withdrawn', 'rejected'];
// deals.channel, a pick list from before the sources were a list: "site" marks a website deal
const CHANNELS = ['site', 'network', 'conference', 'partner_fund', 'accelerator', 'portfolio', 'other'];
const REACHED: DealsSummary['reached'][number]['step'][] = [
   'received',
   'screening',
   'meeting',
   'analysis',
   'ic1',
   'dd',
   'ic2',
   'portfolio',
];

// The applicant's status in the order it moves (docs/ERP.md §5.6); it never goes back.
const PUBLIC = ['submitted', 'screening', 'meeting', 'due_diligence', 'committee', 'closing', 'portfolio'];
const PUBLIC_OF_STAGE: Partial<Record<DealStage, string>> = {
   inbox: 'submitted',
   screening: 'screening',
   meeting: 'meeting',
   analysis: 'due_diligence',
   ic1: 'due_diligence',
   dd: 'due_diligence',
   ic2: 'committee',
   board: 'committee',
   closing: 'closing',
};

// What the panel keeps about each deal's rows between a load and a save.
interface Links {
   application: { guid: string; publicStatus: string } | null;
   enteredAt: string; // the day the current stage began
   norm: number | null; // its norm in working days, kept for the inbox, where the panel runs no clock
   scores: Map<string, string>; // criterion → screening_scores row
   memos: Map<number, string>; // memo version → memos row
   openStage: { guid: string; norm: number | null } | null; // the deal_stage_history row without left_at
}
const links = new Map<string, Links>();

const str = (value: unknown) => (value === null || value === undefined ? '' : String(value));
const num = (value: unknown) => (value === null || value === undefined || value === '' ? 0 : Number(value));
const optional = (value: unknown) => (value === null || value === undefined || value === '' ? undefined : value);
// A DATE comes back as 2026-10-18T00:00:00Z; a DATE_TIME is shown in local time.
const day = (value: unknown) => str(value).slice(0, 10);
const moment = (value: unknown) => (value ? dayjs(str(value)).format('YYYY-MM-DD HH:mm') : '');
const localDay = (value: unknown) => (value ? dayjs(str(value)).format('YYYY-MM-DD') : '');
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// Working days (Monday to Friday) after `from` up to and including `to`.
const workingDaysBetween = (from: string, to: string) => {
   let count = 0;
   for (let date = dayjs(from); date.isBefore(dayjs(to), 'day'); ) {
      date = date.add(1, 'day');
      if (date.day() !== 0 && date.day() !== 6) count += 1;
   }
   return count;
};

const groupByDeal = (rows: Row[]) => {
   const groups = new Map<string, Row[]>();
   for (const row of rows) {
      const id = str(row.deals_id);
      if (id) groups.set(id, [...(groups.get(id) ?? []), row]);
   }
   return groups;
};

// ---- rows → Deal

const toEntry = (row: Row): JournalEntry => {
   const base = { id: row.guid, date: localDay(row.at) };
   const userId = str(row.employee_id);
   switch (row.kind) {
      case 'created':
      case 'taken':
      case 'screening':
      case 'memo':
      case 'approved':
      case 'edited':
         return { ...base, kind: row.kind, userId };
      case 'moved':
         return {
            ...base,
            kind: 'moved',
            stage: str(row.stage),
            status: (str(row.result) || 'active') as DealStatus,
            reason: str(row.text),
            userId,
         };
      case 'stage':
         return { ...base, kind: 'stage', stage: str(row.stage) as DealStage };
      case 'rejected':
         return { ...base, kind: 'rejected', reason: str(row.reason) as RejectReason, userId };
      case 'request':
      case 'answered':
         return { ...base, kind: row.kind, title: str(row.title), userId };
      case 'document':
         return {
            ...base,
            kind: 'document',
            title: str(row.title),
            result: (str(row.result) || 'uploaded') as 'accepted' | 'rejected' | 'uploaded',
            userId,
         };
      case 'workstream':
         return { ...base, kind: 'workstream', name: str(row.title), handed: row.result === 'handed' };
      default:
         return { ...base, kind: 'text', text: str(row.text) || str(row.title) };
   }
};

const toCheck = (row: Row): CheckItem => ({
   id: row.guid,
   text: str(row.text),
   note: str(row.note),
   state: (str(row.state) || 'open') as CheckItem['state'],
   ...(row.fulfilled_by === 'dd_questionnaire' && { fulfilledBy: 'dd_questionnaire' as const }),
});

const checklist = (rows: Row[], list: string) =>
   rows
      .filter((row) => row.list === list)
      .sort((a, b) => num(a.sort_order) - num(b.sort_order))
      .map(toCheck);

const toDocument = (row: Row): DealDocument => {
   const status = (str(row.status) || 'review') as DealDocument['status'];
   // a file the fund uploaded itself is accepted as it is stored
   const byFund = row.uploaded_by === 'fund';
   return {
      id: row.guid,
      title: str(row.title),
      status,
      version: num(row.version),
      url: fileUrl(str(row.file)),
      fileId: str(row.file_id),
      folderId: str(row.deal_folders_id),
      requestId: str(row.deal_requests_id),
      uploadedBy: row.uploaded_by === 'applicant' || byFund ? (row.uploaded_by as 'applicant' | 'fund') : '',
      uploadedById: str(row.uploaded_by_id),
      uploadedAt: moment(row.uploaded_at),
      detail: str(row.reason),
      ...(Boolean(row.handled_by_id) && {
         handled: {
            kind: !byFund && (status === 'accepted' || status === 'rejected') ? status : 'uploaded',
            byId: str(row.handled_by_id),
            at: moment(row.handled_at),
            reason: str(row.reason),
         },
      }),
   };
};

const toFolder = (row: Row): DealFolder => ({
   id: row.guid,
   name: str(row.name),
   parentId: str(row.parent_id),
   sortOrder: num(row.sort_order),
   createdById: str(row.created_by_id),
});

const toRequest = (row: Row): DealRequest => ({
   id: row.guid,
   title: str(row.title),
   text: str(row.text),
   byId: str(row.sent_by_id),
   sentAt: day(row.sent_at),
   dueDate: day(row.due_date),
   status: row.status === 'accepted' || row.status === 'answered' ? 'accepted' : 'waiting',
   closedAt: day(row.closed_at),
   detail: str(row.answer),
   warning: str(row.warning),
});

const toRisk = (row: Row): Risk => ({
   id: row.guid,
   level: row.level === 'high' ? 'high' : 'medium',
   title: str(row.title),
   note: str(row.note),
   ownerId: str(row.owner_id),
   ...(optional(row.short) !== undefined && { short: str(row.short) }),
   ...(optional(row.severity) !== undefined && { severity: num(row.severity) }),
   ...(optional(row.measure) !== undefined && { measure: str(row.measure) }),
});

const toWorkstream = (row: Row): Workstream => ({
   id: row.guid,
   name: str(row.name),
   executor: str(row.executor),
   handedAt: day(row.handed_at),
   dueDate: day(row.due_date),
   status: (str(row.status) || 'not_started') as Workstream['status'],
   conclusion: str(row.conclusion),
});

// A decision of the register (written by Инвесткомитет) as the deal's card shows it.
const DECISION_BODY: Record<string, string> = { ic1: 'ИК-1', ic2: 'ИК-2', board: 'Набсовет' };
const APPROVALS = new Set(['approved', 'approved_conditions', 'sponsor_approved']);
const verdictOf = (outcome: string): Decision['verdict'] => {
   if (APPROVALS.has(outcome)) return 'approved';
   return outcome === 'rejected' ? 'rejected' : 'other';
};
const toDecision = (row: Row): Decision => ({
   id: row.guid,
   body: DECISION_BODY[str(row.stage)] ?? 'ИК',
   detail: [str(row.meeting_label), row.date ? dayjs(day(row.date)).format('D MMMM YYYY') : '']
      .filter(Boolean)
      .join(' · '),
   outcome: [OUTCOMES[str(row.outcome) as keyof typeof OUTCOMES]?.label, str(row.note)]
      .filter(Boolean)
      .join(' · '),
   stage: str(row.stage),
   verdict: verdictOf(str(row.outcome)),
   meetingId: str(row.meetings_id),
   meetingLabel: str(row.meeting_label),
});

const INSTRUMENTS: Instrument[] = ['safe', 'convertible', 'equity'];

// The terms: the numbers in the deal's own fields, the wording in `terms`. An
// older row keeps label–value rows there, which are left out.
const toTerms = (row: Row): DealTerms | undefined => {
   const text = fromJson<Partial<Record<'conditions' | 'valuation' | 'structure' | 'founder', string>>>(row.terms, {});
   const words = Array.isArray(text) ? {} : text;
   const instrument = INSTRUMENTS.find((item) => item === row.instrument) ?? '';
   const terms: DealTerms = {
      instrument,
      roundSize: numOrNull(row.round_size),
      preMoney: numOrNull(row.pre_money),
      conditions: str(words.conditions),
      valuation: str(words.valuation),
      structure: str(words.structure),
      founder: str(words.founder),
      warning: str(row.terms_warning),
   };
   return Object.values(terms).some((value) => value !== '' && value !== null) ? terms : undefined;
};

const termsFields = (terms: DealTerms | undefined) => ({
   instrument: terms?.instrument ?? '',
   round_size: terms?.roundSize ?? null,
   pre_money: terms?.preMoney ?? null,
   terms: terms
      ? toJson({ conditions: terms.conditions, valuation: terms.valuation, structure: terms.structure, founder: terms.founder })
      : null,
   terms_warning: terms?.warning ?? '',
});

// The stages the deal has been on, oldest first.
const toStages = (rows: Row[]): StageRecord[] =>
   rows
      .map((row) => ({
         stage: str(row.stage) as StageRecord['stage'],
         enteredAt: day(row.entered_at),
         leftAt: day(row.left_at),
         daysUsed: numOrNull(row.days_used),
         norm: numOrNull(row.norm_days),
         late: Boolean(row.late),
      }))
      .filter(({ stage, enteredAt }) => stage && enteredAt)
      .sort((a, b) => a.enteredAt.localeCompare(b.enteredAt) || (a.leftAt ? 0 : 1) - (b.leftAt ? 0 : 1));

const toTeamMember = (row: Row): TeamMember => ({
   id: row.guid,
   ...(row.employee_id ? { employeeId: str(row.employee_id) } : {}),
   ...(row.external_name ? { name: str(row.external_name) } : {}),
   role: str(row.role),
});

const toMemo = (rows: Row[], checks: Row[]): Memo | undefined => {
   const versions = [...rows].sort((a, b) => num(a.version) - num(b.version));
   const current = versions.at(-1);
   if (!current) return undefined;
   return {
      version: num(current.version),
      versionDate: day(current.version_date),
      authorId: str(current.author_id),
      sponsorId: str(current.sponsor_id),
      sections: fromJson(current.sections, []),
      snapshot: str(current.snapshot),
      recommendation: (str(current.recommendation) || 'yes') as Memo['recommendation'],
      summary: fromJson<Fact[]>(current.summary, []),
      comment: current.comment_text
         ? { byId: str(current.comment_by_id), at: moment(current.comment_at), text: str(current.comment_text) }
         : null,
      checklistHint: '',
      checklist: checklist(checks, 'memo'),
      versions: versions.map((row) => ({ v: num(row.version), at: day(row.version_date), note: str(row.version_note) })),
      approvedAt: day(current.approved_at) || null,
   };
};

const toScreening = (row: Row, scores: Row[]): Screening | undefined => {
   const touched =
      scores.length ||
      row.screening_decision ||
      row.screening_essence ||
      row.screening_completed_at ||
      row.second_reviewer_id;
   if (!touched) return undefined;
   return {
      criteria: CRITERIA.map(({ key }) => {
         const score = scores.find((item) => item.criterion === key);
         return {
            key,
            score: score && optional(score.score) !== undefined ? num(score.score) : null,
            rationale: str(score?.rationale),
            source: str(score?.source),
         };
      }),
      decision: (str(row.screening_decision) || 'meeting') as Screening['decision'],
      secondId: str(row.second_reviewer_id),
      savedAt: '',
      note: {
         essence: str(row.screening_essence),
         whyNow: str(row.screening_why_now),
         redFlags: str(row.screening_red_flags),
         questions: str(row.screening_questions),
      },
      completedAt: day(row.screening_completed_at) || null,
   };
};

// Working days the deal has spent on its stage, without the days it waited for the applicant.
const daysUsed = (row: Row, today: string) => {
   if (!row.stage_entered_at) return num(row.days_used);
   let used = workingDaysBetween(day(row.stage_entered_at), today) - num(row.paused_days);
   if (row.waiting && row.paused_since) used -= workingDaysBetween(day(row.paused_since), today);
   return Math.max(0, used);
};

interface Children {
   events: Row[];
   documents: Row[];
   folders: Row[];
   scores: Row[];
   requests: Row[];
   risks: Row[];
   checks: Row[];
   team: Row[];
   workstreams: Row[];
   memos: Row[];
   history: Row[];
   decisions: Row[];
}

// "Social media" → "social_media": a source as an older row has it in text.
const asKey = (text: string) =>
   text
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');

// A deal from before the sources were a list: the fund's channel, or what the
// founder answered on the website.
const oldSource = (row: Row) => {
   const channel = str(row.channel);
   return channel && channel !== 'site' ? channel : asKey(str(row.heard_from));
};

// "Узбекистан" → "UZ" when the countries list has that name.
const oldCountry = (text: string) =>
   listOf('countries', true).find((item) =>
      Object.values(item.names).some((name) => name.toLowerCase() === text.trim().toLowerCase()),
   )?.key ?? text;

const toDeal = (
   row: Row,
   children: Children,
   meetings: Map<string, Row>,
): Deal => {
   const today = todayISO();
   const status = (str(row.status) || 'review') as DealStatus;
   const norm = optional(row.stage_norm_days) === undefined ? null : num(row.stage_norm_days);
   const meeting = meetings.get(str(row.meetings_id));
   const reason = listKeyOf('reasons', row.reject_reasons_id);
   const closedAt = day(row.closed_at);
   const facts = fromJson<Fact[] | undefined>(row.facts, undefined);
   const terms = toTerms(row);
   const dd =
      row.dd_due || row.dd_external_cost || row.dd_external_note || row.dd_strengths || row.dd_alert_title || row.dd_closed_note
      ? {
           due: day(row.dd_due),
           closedNote: str(row.dd_closed_note),
           external: {
              value: optional(row.dd_external_cost) === undefined ? '' : `$${num(row.dd_external_cost).toLocaleString('ru-RU')}`,
              note: str(row.dd_external_note),
           },
           strengths: str(row.dd_strengths).split('\n').filter(Boolean),
           alert: row.dd_alert_title ? { title: str(row.dd_alert_title), text: str(row.dd_alert_text) } : null,
        }
      : undefined;
   const readiness = checklist(children.checks, 'readiness');
   const exit = checklist(children.checks, 'exit');

   return {
      id: row.guid,
      number: str(row.number),
      company: str(row.company),
      about: str(row.about),
      industryKey: listKeyOf('industries', row.industries_id) ?? '',
      industry: str(row.niche),
      tags: str(row.tags),
      source: listKeyOf('sources', row.lead_sources_id) ?? oldSource(row),
      fromSite: str(row.channel) === 'site' || Boolean(row.applications_id),
      amount: num(row.amount),
      country: listKeyOf('countries', row.countries_id) ?? oldCountry(str(row.country)),
      roundStage: listKeyOf('rounds', row.round_stages_id) ?? str(row.round_stage),
      receivedAt: moment(row.received_at) || today,
      status,
      stage: (str(row.stage) || 'inbox') as DealStage,
      ownerId: str(row.owner_id),
      proposedOwnerId: str(row.proposed_owner_id),
      days: status === 'active' && norm !== null ? { used: daysUsed(row, today), norm } : null,
      waiting: Boolean(row.waiting),
      next:
         row.next_title || row.next_due
            ? {
                 title: str(row.next_title),
                 dueDate: day(row.next_due) || day(row.stage_due),
                 ...(row.next_time ? { time: str(row.next_time) } : {}),
              }
            : null,
      ...(meeting && {
         committee: { id: meeting.guid, number: num(meeting.number), date: day(meeting.date), time: str(meeting.time) },
      }),
      ...((Boolean(closedAt) || Boolean(reason)) && {
         closed: {
            ...(reason && { reason }),
            note: str(row.closed_note),
            date: closedAt,
            ...(row.closed_letter ? { letter: str(row.closed_letter) } : {}),
            ...(row.resubmit ? { resubmit: str(row.resubmit) as NonNullable<Deal['closed']>['resubmit'] } : {}),
         },
      }),
      ...(facts && { facts }),
      ...(row.facts_note ? { factsHint: str(row.facts_note) } : {}),
      ...(children.history.length > 0 && { stages: toStages(children.history) }),
      ...(terms && { terms }),
      ...(row.metrics ? { metrics: fromJson(row.metrics, { hint: '', items: [], note: '' }) } : {}),
      ...(children.risks.length > 0 && { risks: children.risks.map(toRisk) }),
      ...(readiness.length > 0 && { readiness: { note: '', items: readiness } }),
      ...(children.team.length > 0 && { team: children.team.map(toTeamMember) }),
      ...(row.synergy ? { synergy: fromJson<Fact[]>(row.synergy, []) } : {}),
      ...(row.related ? { related: fromJson<Fact[]>(row.related, []) } : {}),
      screening: toScreening(row, children.scores),
      ...(children.requests.length > 0 && {
         requests: children.requests
            .sort((a, b) => day(a.sent_at).localeCompare(day(b.sent_at)))
            .map(toRequest),
      }),
      ...(children.documents.length > 0 && { documents: children.documents.map(toDocument) }),
      ...(children.folders.length > 0 && {
         folders: children.folders
            .map(toFolder)
            .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
      }),
      ...(row.applicant_email ? { applicantEmail: str(row.applicant_email) } : {}),
      ...((num(row.paused_days) > 0 || Boolean(row.paused_since)) && {
         clock: { pausedDays: num(row.paused_days), pausedSince: day(row.paused_since) },
      }),
      ...(children.workstreams.length > 0 && { workstreams: children.workstreams.map(toWorkstream) }),
      ...(dd && { dd }),
      memo: toMemo(children.memos, children.checks),
      ...(children.decisions.length > 0 && { decisions: children.decisions.map(toDecision) }),
      ...(exit.length > 0 && { exit }),
      // newest first; ucode keeps `at` to the second, its own created_at orders the rest
      journal: [...children.events]
         .sort(
            (a, b) =>
               str(b.at).localeCompare(str(a.at)) ||
               str(b.created_at).localeCompare(str(a.created_at)),
         )
         .map(toEntry),
   };
};

// Reads every deal with its rows.
export const loadDeals = async (): Promise<Deal[]> => {
   const [
      rows,
      events,
      documents,
      folders,
      scores,
      requests,
      risks,
      checks,
      team,
      workstreams,
      memos,
      history,
      decisions,
      applications,
      meetings,
   ] = await Promise.all(
      [
         'deals',
         'deal_events',
         'deal_documents',
         'deal_folders',
         'screening_scores',
         'deal_requests',
         'deal_risks',
         'deal_checklists',
         'deal_team',
         'workstreams',
         'memos',
         'deal_stage_history',
         'decisions',
         'applications',
         'meetings',
      ].map((table) => listRows(table)),
   );

   const meetingRows = new Map(meetings.map((row) => [row.guid, row]));
   const applicationRows = new Map(applications.map((row) => [row.guid, row]));
   const by = {
      events: groupByDeal(events),
      documents: groupByDeal(documents),
      folders: groupByDeal(folders),
      scores: groupByDeal(scores),
      requests: groupByDeal(requests),
      risks: groupByDeal(risks),
      checks: groupByDeal(checks),
      team: groupByDeal(team),
      workstreams: groupByDeal(workstreams),
      memos: groupByDeal(memos),
      history: groupByDeal(history),
      decisions: groupByDeal(decisions),
   };

   links.clear();
   return rows
      .map((row) => {
         const children = Object.fromEntries(
            Object.entries(by).map(([key, groups]) => [key, groups.get(row.guid) ?? []]),
         ) as unknown as Children;
         const application = applicationRows.get(str(row.applications_id));
         const open = children.history.find((item) => !item.left_at);
         links.set(row.guid, {
            application: application
               ? { guid: application.guid, publicStatus: str(application.public_status) }
               : null,
            enteredAt: day(row.stage_entered_at),
            norm: optional(row.stage_norm_days) === undefined ? null : num(row.stage_norm_days),
            scores: new Map(children.scores.map((item) => [str(item.criterion), item.guid])),
            memos: new Map(children.memos.map((item) => [num(item.version), item.guid])),
            openStage: open
               ? { guid: open.guid, norm: optional(open.norm_days) === undefined ? null : num(open.norm_days) }
               : null,
         });
         return toDeal(row, children, meetingRows);
      })
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
};

// The memos row of a deal's memorandum version, for an agenda item to point to.
export const memoRowOf = (dealId: string, version: number) =>
   links.get(dealId)?.memos.get(version) ?? null;

// ---- Deal → rows

const dealFields = (deal: Deal): Record<string, unknown> => ({
   number: deal.number,
   company: deal.company,
   about: deal.about,
   industries_id: listIdOf('industries', deal.industryKey),
   niche: deal.industry,
   tags: deal.tags,
   // the old text fields keep what they always held, next to the relations
   channel: deal.fromSite ? 'site' : CHANNELS.includes(deal.source) ? deal.source : 'other',
   lead_sources_id: listIdOf('sources', deal.source),
   country: itemOf('countries', deal.country)?.names.ru ?? deal.country,
   countries_id: listIdOf('countries', deal.country),
   round_stage: deal.roundStage,
   round_stages_id: listIdOf('rounds', deal.roundStage),
   amount: deal.amount,
   status: deal.status,
   stage: deal.stage,
   owner_id: deal.ownerId,
   proposed_owner_id: deal.proposedOwnerId,
   // set by the committee when it puts the deal on an agenda; a new stage clears it
   meetings_id: deal.committee?.id ?? null,
   stage_norm_days: deal.days?.norm ?? null,
   days_used: deal.days?.used ?? null,
   waiting: deal.waiting,
   next_title: deal.next?.title ?? '',
   next_due: deal.next?.dueDate || null,
   next_time: deal.next?.time ?? '',
   closed_note: deal.closed?.note ?? '',
   closed_letter: deal.closed?.letter ?? '',
   closed_at: deal.closed?.date || null,
   resubmit: deal.closed?.resubmit ?? '',
   reject_reasons_id: (deal.closed?.reason && listIdOf('reasons', deal.closed.reason)) || null,
   applicant_email: deal.applicantEmail ?? '',
   paused_days: deal.clock?.pausedDays ?? 0,
   paused_since: deal.clock?.pausedSince || null,
   facts: deal.facts ? toJson(deal.facts) : null,
   facts_note: deal.factsHint ?? '',
   ...termsFields(deal.terms),
   metrics: deal.metrics ? toJson(deal.metrics) : null,
   synergy: deal.synergy ? toJson(deal.synergy) : null,
   related: deal.related ? toJson(deal.related) : null,
   screening_decision: deal.screening?.decision ?? '',
   screening_essence: deal.screening?.note.essence ?? '',
   screening_why_now: deal.screening?.note.whyNow ?? '',
   screening_red_flags: deal.screening?.note.redFlags ?? '',
   screening_questions: deal.screening?.note.questions ?? '',
   screening_completed_at: deal.screening?.completedAt || null,
   second_reviewer_id: deal.screening?.secondId ?? '',
   dd_due: deal.dd?.due || null,
   dd_closed_note: deal.dd?.closedNote ?? '',
   dd_external_cost: deal.dd?.external.value ? Number(deal.dd.external.value.replace(/[^\d.]/g, '')) || null : null,
   dd_external_note: deal.dd?.external.note ?? '',
   dd_strengths: deal.dd?.strengths.join('\n') ?? '',
   dd_alert_title: deal.dd?.alert?.title ?? '',
   dd_alert_text: deal.dd?.alert?.text ?? '',
});

const eventRow = (entry: JournalEntry, deal: Deal): Record<string, unknown> => {
   const row: Record<string, unknown> = {
      guid: entry.id,
      at: new Date().toISOString(),
      kind: entry.kind,
      stage: deal.stage,
      deals_id: deal.id,
   };
   if ('userId' in entry) row.employee_id = entry.userId;
   if (entry.kind === 'stage') row.stage = entry.stage;
   if (entry.kind === 'rejected') row.reason = entry.reason;
   if (entry.kind === 'request' || entry.kind === 'answered' || entry.kind === 'document') row.title = entry.title;
   if (entry.kind === 'document') row.result = entry.result;
   if (entry.kind === 'workstream') {
      row.title = entry.name;
      row.result = entry.handed ? 'handed' : 'added';
   }
   if (entry.kind === 'text') row.text = entry.text;
   if (entry.kind === 'moved') {
      row.stage = entry.stage;
      row.result = entry.status;
      row.text = entry.reason;
   }
   return row;
};

// Creates the rows of new items and changes the rows of changed ones; the panel removes none.
const syncItems = <T extends { id: string }>(
   table: string,
   before: T[] | undefined,
   after: T[] | undefined,
   toRow: (item: T, index: number) => Record<string, unknown>,
) => {
   const old = new Map((before ?? []).map((item) => [item.id, item]));
   return (after ?? []).map((item, index) => {
      const previous = old.get(item.id);
      if (!previous) return createRow(table, { guid: item.id, ...toRow(item, index) });
      if (!same(previous, item)) return updateRow(table, { guid: item.id, ...toRow(item, index) });
      return Promise.resolve();
   });
};

// Deletes the rows of the items a list no longer has. Only for the lists a
// person edits on the card (risks, team, readiness); the others keep theirs.
const removedItems = <T extends { id?: string }>(table: string, before: T[] | undefined, after: T[] | undefined) => {
   const kept = new Set((after ?? []).map(({ id }) => id));
   return (before ?? [])
      .filter(({ id }) => id && !kept.has(id))
      .map(({ id }) => deleteRow(table, id as string));
};

const checkRow = (deal: Deal, list: string) => (item: CheckItem, index: number) => ({
   list,
   stage: deal.stage,
   text: item.text,
   note: item.note,
   state: item.state,
   fulfilled_by: item.fulfilledBy ?? '',
   sort_order: index,
   deals_id: deal.id,
});

// The day a declined applicant may apply again (docs/ERP.md §5.2, deal_reject).
const resubmitAfter = (closed: NonNullable<Deal['closed']>, today: string) => {
   if (closed.reason === 'mandate_scope' || closed.reason === 'mandate_check') return today;
   if (closed.resubmit === 'in_6_months') return dayjs(today).add(6, 'month').format('YYYY-MM-DD');
   if (closed.resubmit === 'in_12_months') return dayjs(today).add(12, 'month').format('YYYY-MM-DD');
   return today;
};

// What the website shows the applicant for the deal, or null to leave it.
const publicStatusOf = (deal: Deal) => {
   if (deal.status === 'rejected') return 'rejected';
   if (deal.status === 'portfolio') return 'portfolio';
   if (deal.status === 'paused' || deal.status === 'withdrawn') return null;
   if (deal.status === 'review') return 'submitted';
   // a stage the fund added shows the applicant the stage before it
   const keys = stageKeys();
   for (let index = keys.indexOf(deal.stage); index >= 0; index--) {
      const status = PUBLIC_OF_STAGE[keys[index]];
      if (status) return status;
   }
   return PUBLIC_OF_STAGE[deal.stage] ?? null;
};

const emptyLinks = (): Links => ({
   application: null,
   enteredAt: todayISO(),
   norm: null,
   scores: new Map(),
   memos: new Map(),
   openStage: null,
});

// Creates a deal entered in the panel, with its first journal entry.
export const insertDeal = async (deal: Deal) => {
   await createRow('deals', {
      guid: deal.id,
      ...dealFields(deal),
      received_at: new Date().toISOString(),
      stage_entered_at: todayISO(),
   });
   links.set(deal.id, emptyLinks());
   await Promise.all(deal.journal.map((entry) => createRow('deal_events', eventRow(entry, deal))));
};

// Writes what changed between the deal before and after a change.
export const saveDeal = async (before: Deal, after: Deal) => {
   const link = links.get(after.id) ?? emptyLinks();
   links.set(after.id, link);
   const today = todayISO();
   const writes: Promise<unknown>[] = [];

   // the deal's own row: only the fields that changed
   const fieldsBefore = dealFields(before);
   const fields = Object.fromEntries(
      Object.entries(dealFields(after)).filter(([key, value]) => !same(value, fieldsBefore[key])),
   );
   // a new stage, or a new status (taken in, paused, resumed, closed, reopened)
   const movedOn = before.stage !== after.stage || before.status !== after.status;
   if (movedOn && after.status === 'active') {
      fields.stage_entered_at = today;
      fields.stage_due = after.next?.dueDate || null;
   }
   if (Object.keys(fields).length) writes.push(updateRow('deals', { guid: after.id, ...fields }));

   // the journal's new entries
   const known = new Set(before.journal.map(({ id }) => id));
   for (const entry of after.journal)
      if (!known.has(entry.id)) writes.push(createRow('deal_events', eventRow(entry, after)));

   // screening: one row per criterion
   for (const criterion of after.screening?.criteria ?? []) {
      const previous = before.screening?.criteria.find(({ key }) => key === criterion.key);
      const guid = link.scores.get(criterion.key);
      if (guid && previous && same(previous, criterion)) continue;
      const row = {
         criterion: criterion.key,
         score: criterion.score,
         rationale: criterion.rationale,
         source: criterion.source,
         deals_id: after.id,
      };
      writes.push(
         guid
            ? updateRow('screening_scores', { guid, ...row })
            : createRow('screening_scores', row).then((created) => {
                 if (created?.guid) link.scores.set(criterion.key, created.guid);
              }),
      );
   }

   // the deal's lists
   writes.push(
      ...syncItems('deal_requests', before.requests, after.requests, (item: DealRequest) => ({
         title: item.title,
         text: item.text,
         sent_by_id: item.byId,
         sent_at: item.sentAt || null,
         due_date: item.dueDate || null,
         status: item.status,
         closed_at: item.closedAt || null,
         answer: item.detail,
         warning: item.warning,
         deals_id: after.id,
      })),
      ...syncItems('deal_documents', before.documents, after.documents, (item: DealDocument) => ({
         title: item.title,
         status: item.status,
         version: item.version,
         handled_by_id: item.handled?.byId ?? '',
         handled_at: item.handled?.at ? dayjs(item.handled.at).toISOString() : null,
         reason: item.handled?.reason ?? '',
         file: item.url,
         file_id: item.fileId,
         deal_folders_id: item.folderId || null,
         deal_requests_id: item.requestId || null,
         ...(item.uploadedBy && { uploaded_by: item.uploadedBy }),
         ...(item.uploadedAt && { uploaded_at: dayjs(item.uploadedAt).toISOString() }),
         uploaded_by_id: item.uploadedById,
         deals_id: after.id,
      })),
      ...removedItems('deal_documents', before.documents, after.documents),
      ...syncItems('deal_folders', before.folders, after.folders, (item: DealFolder) => ({
         name: item.name,
         parent_id: item.parentId,
         sort_order: item.sortOrder,
         created_by_id: item.createdById,
         deals_id: after.id,
      })),
      ...removedItems('deal_folders', before.folders, after.folders),
      ...removedItems('deal_requests', before.requests, after.requests),
      ...removedItems('workstreams', before.workstreams, after.workstreams),
      ...syncItems('deal_risks', before.risks, after.risks, (item: Risk) => ({
         level: item.level,
         severity: item.severity ?? null,
         title: item.title,
         short: item.short ?? '',
         note: item.note,
         measure: item.measure ?? '',
         owner_id: item.ownerId,
         deals_id: after.id,
      })),
      ...syncItems('workstreams', before.workstreams, after.workstreams, (item: Workstream) => ({
         name: item.name,
         executor: item.executor,
         handed_at: item.handedAt || null,
         due_date: item.dueDate || null,
         status: item.status,
         conclusion: item.conclusion,
         deals_id: after.id,
      })),
      ...syncItems('deal_checklists', before.exit, after.exit, checkRow(after, 'exit')),
      ...syncItems('deal_checklists', before.readiness?.items, after.readiness?.items, checkRow(after, 'readiness')),
      ...removedItems('deal_checklists', before.readiness?.items, after.readiness?.items),
      ...removedItems('deal_risks', before.risks, after.risks),
      // the members the owner added; the others are counted from the deal
      ...syncItems(
         'deal_team',
         before.team?.filter((member): member is TeamMember & { id: string } => !!member.id),
         after.team?.filter((member): member is TeamMember & { id: string } => !!member.id),
         (member) => ({
            employee_id: member.employeeId ?? '',
            external_name: member.name ?? '',
            role: member.role,
            deals_id: after.id,
         }),
      ),
      ...removedItems('deal_team', before.team, after.team),
      ...syncItems('deal_checklists', before.memo?.checklist, after.memo?.checklist, checkRow(after, 'memo')),
      ...syncItems('decisions', before.decisions, after.decisions, (item: Decision) => ({
         body: item.body === 'Набсовет' ? 'board' : 'ic',
         stage: item.body === 'ИК-1' ? 'ic1' : item.body === 'ИК-2' ? 'ic2' : 'board',
         meeting_label: item.detail,
         note: item.outcome,
         date: today,
         deals_id: after.id,
      })),
   );

   // the memorandum: a row per version
   if (after.memo && !same(after.memo, before.memo)) {
      const memo = after.memo;
      const guid = link.memos.get(memo.version);
      const row = {
         version: memo.version,
         version_date: memo.versionDate || null,
         version_note: memo.versions.find(({ v }) => v === memo.version)?.note ?? '',
         author_id: memo.authorId,
         sponsor_id: memo.sponsorId,
         recommendation: memo.recommendation,
         snapshot: memo.snapshot,
         summary: toJson(memo.summary),
         sections: toJson(memo.sections),
         approved_at: memo.approvedAt || null,
         comment_by_id: memo.comment?.byId ?? '',
         comment_at: memo.comment?.at ? dayjs(memo.comment.at).toISOString() : null,
         comment_text: memo.comment?.text ?? '',
         deals_id: after.id,
      };
      writes.push(
         guid
            ? updateRow('memos', { guid, ...row })
            : createRow('memos', row).then((created) => {
                 if (created?.guid) link.memos.set(memo.version, created.guid);
              }),
      );
   }

   // the stage history: the stage left is closed, the stage entered is opened
   if (movedOn) {
      const used =
         before.days?.used ?? (link.enteredAt ? workingDaysBetween(link.enteredAt, today) : null);
      const norm = before.days?.norm ?? link.openStage?.norm ?? link.norm;
      const closing = {
         left_at: today,
         days_used: used,
         late: used !== null && norm !== null && used > norm,
      };
      if (link.openStage) writes.push(updateRow('deal_stage_history', { guid: link.openStage.guid, ...closing }));
      else
         writes.push(
            createRow('deal_stage_history', {
               stage: before.stage,
               entered_at: link.enteredAt || before.receivedAt.slice(0, 10),
               norm_days: norm,
               ...closing,
               deals_id: after.id,
            }),
         );
      link.openStage = null;
      if (after.status === 'active') {
         link.enteredAt = today;
         link.norm = after.days?.norm ?? null;
         writes.push(
            createRow('deal_stage_history', {
               stage: after.stage,
               entered_at: today,
               norm_days: after.days?.norm ?? null,
               deals_id: after.id,
            }).then((created) => {
               if (created?.guid) link.openStage = { guid: created.guid, norm: after.days?.norm ?? null };
            }),
         );
      }
      if (after.status === 'portfolio')
         writes.push(
            createRow('deal_stage_history', {
               stage: 'portfolio',
               entered_at: today,
               left_at: today,
               deals_id: after.id,
            }),
         );
   }

   // the applicant's side on the website: the public status, and when they may apply again
   const application = link.application;
   const next = publicStatusOf(after);
   if (application && next && next !== application.publicStatus) {
      const forward =
         next === 'rejected' || PUBLIC.indexOf(next) > PUBLIC.indexOf(application.publicStatus);
      if (forward) {
         const row: Row = {
            guid: application.guid,
            public_status: next,
            public_status_at: new Date().toISOString(),
         };
         if (next === 'rejected' && after.closed) row.resubmit_after = resubmitAfter(after.closed, today);
         writes.push(updateRow('applications', row));
         application.publicStatus = next;
      }
   }

   await Promise.all(writes);
};

// ---- the register's figures, counted from the deals

export const summarize = (deals: Deal[]): DealsSummary => {
   const reachedIndex = (deal: Deal) => {
      if (deal.status === 'portfolio') return REACHED.length - 1;
      const entered = deal.journal.filter((entry) => entry.kind === 'stage').map((entry) => entry.stage);
      const stages = deal.status === 'review' ? entered : [deal.stage, ...entered];
      return Math.max(0, ...stages.map((stage) => REACHED.indexOf(stage)));
   };
   const lastMonth = dayjs(todayISO()).subtract(1, 'month').format('YYYY-MM');
   return {
      total: deals.length,
      since: Math.min(Number(todayISO().slice(0, 4)), ...deals.map((deal) => Number(deal.receivedAt.slice(0, 4)))),
      byStatus: Object.fromEntries(
         STATUSES.map((status) => [status, deals.filter((deal) => deal.status === status).length]),
      ) as Record<DealStatus, number>,
      reached: REACHED.map((step, index) => ({
         step,
         count: deals.filter((deal) => reachedIndex(deal) >= index).length,
      })),
      reasons: Object.fromEntries(
         listOf('reasons', true).map(({ key }) => [key, deals.filter((deal) => deal.closed?.reason === key).length]),
      ),
      lastMonth: {
         month: lastMonth,
         received: deals.filter((deal) => deal.receivedAt.startsWith(lastMonth)).length,
      },
   };
};

