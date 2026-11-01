import { SITE_PATH } from '@shared/constants';
import clsx from 'clsx';
import {
   Ban,
   BookOpen,
   Briefcase,
   CalendarClock,
   ChartColumn,
   CircleCheck,
   CircleHelp,
   Coins,
   FileCheck,
   Gift,
   Globe,
   GraduationCap,
   Handshake,
   Heart,
   History,
   Image,
   Info,
   LayoutGrid,
   ListChecks,
   type LucideIcon,
   MapPin,
   MessagesSquare,
   Newspaper,
   Rocket,
   Scale,
   SlidersHorizontal,
   ThumbsUp,
   Workflow,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { SITE_GROUPS, type SiteSection } from '../../constants';

const ICONS: Record<SiteSection, LucideIcon> = {
   home_terms: Info,
   home_stats: ChartColumn,
   for_startups: Rocket,
   for_investors: Coins,
   programs: GraduationCap,
   founder_statuses: CircleCheck,
   benefits: Gift,
   process: Workflow,
   beliefs: Heart,
   timeline: CalendarClock,
   documents: FileCheck,
   pitch_faq: MessagesSquare,
   history: History,
   facts: SlidersHorizontal,
   sectors: LayoutGrid,
   anti_thesis: Ban,
   geography: Globe,
   three_yes: ThumbsUp,
   portfolio: Briefcase,
   news: Newspaper,
   sources: BookOpen,
   investor_benefits: ListChecks,
   faq: CircleHelp,
   contacts: MapPin,
   partners: Handshake,
   media: Image,
   legal: Scale,
};

interface SiteNavProps {
   active: SiteSection;
   newPartners: number; // requests nobody has taken yet
}

/* The sections of «Сайт» in their groups, as Настройки has them: a card beside
   the section on wide screens, a select above it on narrow ones. */
const SiteNav = ({ active, newPartners }: SiteNavProps) => {
   const { t } = useTranslation('site');
   const navigate = useNavigate();

   return (
      <>
         <label className='lg:hidden'>
            <span className='sr-only'>{t('Раздел сайта')}</span>
            <select
               className='field-input bg-white'
               value={active}
               onChange={(event) =>
                  navigate(`${SITE_PATH}/${event.target.value}`)
               }
            >
               {SITE_GROUPS.map((group) => (
                  <optgroup key={group.label} label={t(group.label)}>
                     {group.sections.map((section) => (
                        <option key={section.id} value={section.id}>
                           {t(section.label)}
                        </option>
                     ))}
                  </optgroup>
               ))}
            </select>
         </label>
         <nav
            aria-label={t('Разделы сайта')}
            className='border-line hidden rounded-xl border bg-white p-2 lg:block lg:max-h-[calc(100%-1.25rem)] lg:self-start lg:overflow-y-auto'
         >
            {SITE_GROUPS.map((group) => (
               <div key={group.label}>
                  <div className='text-ink-faint px-2.5 pt-2 pb-1 text-[11px] font-semibold'>
                     {t(group.label)}
                  </div>
                  <ul>
                     {group.sections.map((section) => {
                        const current = section.id === active;
                        const Icon = ICONS[section.id];
                        return (
                           <li key={section.id}>
                              <Link
                                 aria-current={current ? 'page' : undefined}
                                 className={clsx(
                                    'text-meta flex items-center gap-2 rounded-lg px-2.5 py-1.5 font-medium transition-colors',
                                    current
                                       ? 'bg-accent-tint text-ink-strong'
                                       : 'text-ink-soft hover:bg-hover hover:text-ink',
                                 )}
                                 data-hint={t(section.meta)}
                                 to={`${SITE_PATH}/${section.id}`}
                              >
                                 <Icon
                                    aria-hidden
                                    className={clsx(
                                       'size-3.75 shrink-0 transition-colors',
                                       current
                                          ? 'text-accent'
                                          : 'text-ink-faint',
                                    )}
                                 />
                                 <span className='min-w-0 flex-1 truncate'>
                                    {t(section.label)}
                                 </span>
                                 {section.id === 'partners' &&
                                    newPartners > 0 && (
                                       <span className='bg-accent-tint text-accent-strong rounded-full px-1.5 text-[11px] leading-4.5 tabular-nums'>
                                          {newPartners}
                                       </span>
                                    )}
                              </Link>
                           </li>
                        );
                     })}
                  </ul>
               </div>
            ))}
         </nav>
      </>
   );
};

export default SiteNav;
