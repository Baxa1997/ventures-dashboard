import {
   LIST_SECTIONS,
   SETTINGS_GROUPS,
   type SettingsSection,
} from '@modules/Settings/constants';
import { SETTINGS_PATH } from '@shared/constants';
import type { ListItem, ListKind } from '@shared/types/settings.types';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';

interface SettingsNavProps {
   active: SettingsSection;
   counts: Record<ListKind, ListItem[]>;
   staff: number;
   unsaved: SettingsSection[]; // sections with changes not saved yet
}

/* The sections of Настройки in their groups: a column beside the content on
   wide screens, a select above it on narrow ones. A list shows how many of
   its rows are in use; a section with unsaved changes, a dot. */
const SettingsNav = ({ active, counts, staff, unsaved }: SettingsNavProps) => {
   const { t } = useTranslation('settings');
   const navigate = useNavigate();

   const countOf = (id: SettingsSection) => {
      const kind = LIST_SECTIONS[id as keyof typeof LIST_SECTIONS];
      if (kind) return counts[kind].filter((item) => item.active).length;
      return id === 'users' ? staff : undefined;
   };

   return (
      <>
         <label className='lg:hidden'>
            <span className='sr-only'>{t('Раздел настроек')}</span>
            <select
               className='field-input'
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
            className='border-line animate-rise hidden self-start rounded-lg border bg-white py-2 lg:sticky lg:top-4 lg:block'
         >
            {SETTINGS_GROUPS.map((group) => (
               <div key={group.label} className='py-1.5'>
                  <div className='text-ink-faint px-4 pb-1 text-[11px] font-semibold tracking-wide uppercase'>
                     {t(group.label)}
                  </div>
                  <ul>
                     {group.sections.map((section) => {
                        const current = section.id === active;
                        const count = countOf(section.id);
                        return (
                           <li key={section.id}>
                              <Link
                                 aria-current={current ? 'page' : undefined}
                                 className={clsx(
                                    'text-meta flex items-center gap-2 px-4 py-1.5',
                                    current
                                       ? 'bg-accent-tint text-accent font-semibold shadow-[inset_3px_0_0_var(--color-accent)]'
                                       : 'text-ink hover:bg-ground',
                                 )}
                                 to={`${SETTINGS_PATH}/${section.id}`}
                              >
                                 <span className='min-w-0 flex-1 truncate'>
                                    {t(section.label)}
                                 </span>
                                 {unsaved.includes(section.id) && (
                                    <span
                                       className='bg-warning-ink size-1.5 shrink-0 rounded-full'
                                       title={t('Есть несохранённые изменения')}
                                    />
                                 )}
                                 {count !== undefined && (
                                    <span className='text-ink-soft text-xs tabular-nums'>
                                       {count}
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

export default SettingsNav;
