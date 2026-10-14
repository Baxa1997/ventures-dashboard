import { TEAM } from '@shared/constants';
import { shortName } from '@shared/helpers';
import type { Deal } from '@shared/types/deals.types';
import { ALL } from '../../../constants';

// Whether a deal matches what is typed in a search field.
export const matchesSearch = (deal: Deal, search: string) => {
   const query = search.trim().toLowerCase();
   return (
      !query ||
      `${deal.company} ${deal.number} ${deal.industry} ${deal.about}`
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
   [...new Set(deals.map(({ industry }) => industry))]
      .sort((a, b) => a.localeCompare(b))
      .map((industry) => ({ value: industry, label: industry }));
