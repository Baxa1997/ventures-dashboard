import { industryText } from '@modules/Deals/helpers';
import { listOf, nameOf } from '@modules/Settings/services';
import { TEAM } from '@shared/constants';
import { shortName } from '@shared/helpers';
import type { Deal } from '@shared/types/deals.types';
import type { TFunction } from 'i18next';
import { ALL } from '../../../constants';

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

export const matches = <T extends string>(filter: T | typeof ALL, value: T) =>
   filter === ALL || filter === value;

// The people who own at least one of the deals, as filter options.
export const ownerOptions = (deals: Deal[]) =>
   TEAM.filter(({ id }) => deals.some((deal) => deal.ownerId === id)).map(
      ({ id, name }) => ({ value: id, label: shortName(name) }),
   );

export const industryOptions = (deals: Deal[]) =>
   [...new Set(deals.map(industryText))]
      .sort((a, b) => a.localeCompare(b))
      .map((industry) => ({ value: industry, label: industry }));

// "Сайт" and the sources of Настройки, as filter options.
export const SITE = 'site';

export const sourceOptions = (t: TFunction<'deals'>) => [
   { value: SITE, label: t('Сайт') },
   ...listOf('sources').map((item) => ({
      value: item.key,
      label: nameOf(item),
   })),
];

export const matchesSource = (filter: string, deal: Deal) =>
   filter === ALL || (filter === SITE ? deal.fromSite : deal.source === filter);
