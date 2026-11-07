import settings, { rightOf } from '@modules/Settings/services';
import {
   FINANCE_PATH,
   SECTION_PATHS,
   SETTINGS_PATH,
   SITE_PATH,
} from '@shared/constants';
import { useCurrentUser, useServiceData } from '@shared/hooks';
import type { RightSection } from '@shared/types/settings.types';

const load = () => settings.getSettings();
const subscribe = (listener: () => void) => settings.subscribe(listener);

/* What the signed-in person may do in each section, as Настройки → Роли say;
   it reads the settings and renders again once they change, so a right
   changed there applies without reloading the page. */
export const useRights = () => {
   const user = useCurrentUser();
   useServiceData(load, subscribe);
   return (section: RightSection) => rightOf(user, section);
};

const SECTION_OF_PATH: [string, RightSection][] = [
   [SECTION_PATHS.deals, 'deals'],
   [SECTION_PATHS.committee, 'committee'],
   [SECTION_PATHS.portfolio, 'portfolio'],
   [SECTION_PATHS.documents, 'documents'],
   [SECTION_PATHS.contracts, 'contracts'],
   [SECTION_PATHS.procurement, 'procurement'],
   [FINANCE_PATH, 'finance'],
   [SITE_PATH, 'site'],
   [SETTINGS_PATH, 'settings'],
];

// The section an address belongs to: /deals/… is Сделки; none for Работа.
export const sectionOfPath = (pathname: string): RightSection | null =>
   SECTION_OF_PATH.find(
      ([path]) => pathname === path || pathname.startsWith(`${path}/`),
   )?.[1] ?? null;
