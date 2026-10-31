import {
   SETTINGS_GROUPS,
   type SettingsSection,
} from '@modules/Settings/constants';
import { SETTINGS_PATH } from '@shared/constants';
import clsx from 'clsx';
import {
   CalendarClock,
   CircleDot,
   CircleX,
   ClipboardCheck,
   ClipboardList,
   Factory,
   FileSignature,
   FileStack,
   Flag,
   Folders,
   Gauge,
   GitCommitHorizontal,
   History,
   Layers,
   ListOrdered,
   type LucideIcon,
   MapPin,
   Plug,
   Radar,
   Scale,
   ScanSearch,
   Shapes,
   ShieldCheck,
   Tags,
   Target,
   Truck,
   Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';

// Each section's icon, as the prototype gives them; ours that it has not
// (the mandate, the flags, the committee, the integrations) in the same set.
const SECTION_ICONS: Record<SettingsSection, LucideIcon> = {
   'task-types': Tags,
   'task-statuses': CircleDot,
   stages: GitCommitHorizontal,
   industries: Factory,
   rounds: Layers,
   sources: Radar,
   countries: MapPin,
   reasons: CircleX,
   criteria: ScanSearch,
   questionnaire: ClipboardList,
   'dd-audits': ClipboardCheck,
   'doc-folders': Folders,
   'doc-templates': FileStack,
   metrics: Gauge,
   'report-docs': CalendarClock,
   flags: Flag,
   mandate: Target,
   committee: Scale,
   'contract-types': FileSignature,
   'proc-categories': Shapes,
   vendors: Truck,
   'proc-stages': ListOrdered,
   users: Users,
   roles: ShieldCheck,
   integrations: Plug,
   journal: History,
};

interface SettingsNavProps {
   active: SettingsSection;
   unsaved: SettingsSection[]; // sections with changes not saved yet
}

/* The sections of Настройки in their groups: a card beside the section on
   wide screens, which scrolls by itself when it is taller than the page, and
   a select above the section on narrow ones. A section with unsaved changes
   has a dot. */
const SettingsNav = ({ active, unsaved }: SettingsNavProps) => {
   const { t } = useTranslation('settings');
   const navigate = useNavigate();

   return (
      <>
         <label className='lg:hidden'>
            <span className='sr-only'>{t('Раздел настроек')}</span>
            <select
               className='field-input bg-white'
               value={active}
               onChange={(event) =>
                  navigate(`${SETTINGS_PATH}/${event.target.value}`)
               }
            >
               {SETTINGS_GROUPS.map((group) => (
                  <optgroup key={group.label} label={t(group.label)}>
                     {group.sections.map((section) => (
                        <option key={section.id} value={section.id}>
                           {t(section.label)}
                           {unsaved.includes(section.id) ? ' •' : ''}
                        </option>
                     ))}
                  </optgroup>
               ))}
            </select>
         </label>
         <nav
            aria-label={t('Разделы настроек')}
            className='border-line hidden rounded-xl border bg-white p-2 lg:block lg:max-h-[calc(100%-1.25rem)] lg:self-start lg:overflow-y-auto'
         >
            {SETTINGS_GROUPS.map((group) => (
               <div key={group.label}>
                  <div className='text-ink-faint px-2.5 pt-2 pb-1 text-[11px] font-semibold'>
                     {t(group.label)}
                  </div>
                  <ul>
                     {group.sections.map((section) => {
                        const current = section.id === active;
                        const Icon = SECTION_ICONS[section.id];
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
                                 data-hint={t('Открыть этот раздел настроек')}
                                 to={`${SETTINGS_PATH}/${section.id}`}
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
                                 {unsaved.includes(section.id) && (
                                    <span
                                       className='bg-warning size-1.5 shrink-0 rounded-full'
                                       title={t('Есть несохранённые изменения')}
                                    />
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

export default SettingsNav;
