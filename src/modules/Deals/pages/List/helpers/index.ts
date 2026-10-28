import { STATUS_LABELS } from '@modules/Deals/constants';
import {
   columnOf,
   COMMITTEE_STAGES,
   industryText,
   stageKeys,
   stageName,
} from '@modules/Deals/helpers';
import { listOf, nameOf } from '@modules/Settings/services';
import type { BadgeTone } from '@shared/components';
import { TEAM } from '@shared/constants';
import { shortName } from '@shared/helpers';
import type { Deal, DealStatus } from '@shared/types/deals.types';
import type { TFunction } from 'i18next';
import {
   DEAL_VIEWS,
   type DealView,
   DEFAULT_STAGE_FILTER,
   type StageFilter,
} from '../constants';

export const toView = (value: string | null): DealView =>
   DEAL_VIEWS.find((view) => view === value) ?? 'table';

// The closed statuses, each a filter and a column of its own.
export const CLOSED_COLUMNS: Exclude<DealStatus, 'review' | 'active'>[] = [
   'paused',
   'withdrawn',
   'rejected',
   'portfolio',
];

const inWork = ({ status }: Deal) => status === 'review' || status === 'active';

export { columnOf };

// ?stage= of the address; ?tab=inbox, of the page before, as the inbox stage.
export const toStageFilter = (
   stage: string | null,
   tab: string | null,
): StageFilter => {
   if (tab === 'inbox') return 'stage:inbox';
   if (stage === 'work' || stage === 'all') return stage;
   if (stage?.startsWith('stage:') || stage?.startsWith('status:'))
      return stage as StageFilter;
   return DEFAULT_STAGE_FILTER;
};

export const matchesStage = (filter: StageFilter, deal: Deal) => {
   if (filter === 'all') return true;
   if (filter === 'work') return inWork(deal);
   if (filter.startsWith('stage:'))
      return inWork(deal) && columnOf(deal) === filter.slice(6);
   return columnOf(deal) === filter;
};

// The board's columns for a filter: the stages in work, then the closed
// statuses when all deals are shown.
export const boardColumns = (filter: StageFilter) => {
   if (filter === 'work') return stageKeys();
   if (filter === 'all')
      return [
         ...stageKeys(),
         ...CLOSED_COLUMNS.map((status) => `status:${status}`),
      ];
   return [filter.startsWith('stage:') ? filter.slice(6) : filter];
};

export const columnName = (t: TFunction<'deals'>, column: string) =>
   column.startsWith('status:')
      ? t(STATUS_LABELS[column.slice(7) as DealStatus])
      : stageName(column);

/* A stage's colour, by the part of the way it belongs to, as the dashboard's
   funnel colours them: a new application, the work on the deal, the
   committees and closing; then the portfolio, a refusal, a pause. */
export const columnTone = (column: string): BadgeTone => {
   if (column === 'inbox') return 'accent';
   if (COMMITTEE_STAGES.includes(column) || column === 'closing')
      return 'indigo';
   if (column === 'status:portfolio') return 'success';
   if (column === 'status:rejected') return 'danger';
   if (column.startsWith('status:')) return 'neutral';
   return 'warning';
};

// The stage filter's options: in work, all, each stage, each closed status.
export const stageFilterOptions = (t: TFunction<'deals'>) => [
   { value: 'work', label: t('В работе') },
   { value: 'all', label: t('Все этапы') },
   ...stageKeys().map((key) => ({
      value: `stage:${key}`,
      label: stageName(key),
   })),
   ...CLOSED_COLUMNS.map((status) => ({
      value: `status:${status}`,
      label: t(STATUS_LABELS[status]),
   })),
];

export const industryOptions = () =>
   listOf('industries').map((item) => ({
      value: item.key,
      label: nameOf(item),
   }));

// The people who own at least one of the deals.
export const ownerOptions = (deals: Deal[]) =>
   TEAM.filter(({ id }) => deals.some((deal) => deal.ownerId === id)).map(
      ({ id, name }) => ({ value: id, label: shortName(name) }),
   );

// Whether a deal matches what is typed in a search field.
export const matchesSearch = (deal: Deal, search: string) => {
   const query = search.trim().toLowerCase();
   return (
      !query ||
      `${deal.company} ${deal.number} ${industryText(deal)} ${deal.about}`
         .toLowerCase()
         .includes(query)
   );
};

// The screening's score, 1 to 5: the mean of the criteria scored so far.
export const scoreOf = ({ screening }: Deal) => {
   const scored = (screening?.criteria ?? []).filter(
      ({ score }) => score !== null,
   );
   return scored.length
      ? scored.reduce((sum, { score }) => sum + (score ?? 0), 0) /
           scored.length
      : null;
};

// Green from 4, amber from 3.2, red below, as the design colours the score.
export const scoreClass = (score: number) => {
   if (score >= 4) return 'text-success';
   return score >= 3.2 ? 'text-warning' : 'text-danger';
};
