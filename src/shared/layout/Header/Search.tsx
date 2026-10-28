import { STATUS_LABELS } from '@modules/Deals/constants';
import deals from '@modules/Deals/services';
import { stageName } from '@modules/Settings/services';
import work from '@modules/Work/services';
import { MY_DAY_PATH, SECTION_PATHS } from '@shared/constants';
import type { Deal } from '@shared/types/deals.types';
import type { Task } from '@shared/types/work.types';
import {
   Gavel,
   Inbox,
   ListChecks,
   type LucideIcon,
   Rocket,
   Search as SearchIcon,
   Sun,
} from 'lucide-react';
import {
   type Dispatch,
   type SetStateAction,
   useEffect,
   useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { MENU_ITEMS } from '../Sidebar/constants';

interface Result {
   key: string;
   to: string;
   icon: LucideIcon;
   text: string;
   note?: string;
}

interface Group {
   label: string;
   results: Result[];
}

const DEALS_SHOWN = 6;
const TASKS_SHOWN = 5;

export const KBD =
   'border-line-strong text-ink-soft rounded border bg-white px-1.25 text-[11px] leading-4';

interface SearchProps {
   open: boolean;
   setOpen: Dispatch<SetStateAction<boolean>>;
}

/* The top bar's search: the menu's sections, the deals and the tasks, found
   by a part of their name. The top bar opens it, and so does ⌘K (Ctrl+K)
   from anywhere; Esc closes it, Enter opens the first thing found. */
const Search = ({ open, setOpen }: SearchProps) => {
   const { t } = useTranslation('layout');
   const { t: tDeals } = useTranslation('deals');
   const navigate = useNavigate();
   const [query, setQuery] = useState('');
   const [data, setData] = useState<{ deals: Deal[]; tasks: Task[] }>({
      deals: [],
      tasks: [],
   });

   useEffect(() => {
      const onKeyDown = (event: KeyboardEvent) => {
         if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
            event.preventDefault();
            setOpen((prev) => !prev);
         }
         if (event.key === 'Escape') setOpen(false);
      };
      document.addEventListener('keydown', onKeyDown);
      return () => document.removeEventListener('keydown', onKeyDown);
   }, [setOpen]);

   // the deals and the tasks are read when the search opens
   useEffect(() => {
      if (!open) return;
      setQuery('');
      let active = true;
      Promise.all([deals.getDeals(), work.getTasks()]).then(
         ([foundDeals, tasks]) => {
            if (active) setData({ deals: foundDeals, tasks });
         },
      );
      return () => {
         active = false;
      };
   }, [open]);

   const text = query.trim().toLowerCase();
   const has = (value: string) => value.toLowerCase().includes(text);

   const groups: Group[] = text
      ? [
           {
              label: t('Разделы'),
              results: MENU_ITEMS.filter((item) => has(t(item.label)))
                 .map((item) => ({
                    key: item.to,
                    to: item.to,
                    icon: item.icon,
                    text: t(item.label),
                 })),
           },
           {
              label: t('Сделки'),
              results: data.deals
                 .filter((deal) => has(`${deal.company} ${deal.number}`))
                 .slice(0, DEALS_SHOWN)
                 .map((deal) => ({
                    key: deal.id,
                    to: `${SECTION_PATHS.deals}/${deal.id}`,
                    icon: Rocket,
                    text: deal.company,
                    note:
                       deal.status === 'active'
                          ? stageName(deal.stage)
                          : tDeals(STATUS_LABELS[deal.status]),
                 })),
           },
           {
              label: t('Задачи'),
              results: data.tasks
                 .filter((task) => has(task.title))
                 .slice(0, TASKS_SHOWN)
                 .map((task) => ({
                    key: task.id,
                    to: `${SECTION_PATHS.tasks}?task=${task.id}`,
                    icon: ListChecks,
                    text: task.title,
                 })),
           },
        ].filter(({ results }) => results.length)
      : [
           {
              label: t('Быстрые переходы'),
              results: [
                 {
                    key: 'committee',
                    to: SECTION_PATHS.committee,
                    icon: Gavel,
                    text: t('Повестка ближайшего ИК'),
                 },
                 {
                    key: 'inbox',
                    to: `${SECTION_PATHS.deals}?stage=stage:inbox`,
                    icon: Inbox,
                    text: t('Новые заявки'),
                 },
                 {
                    key: 'my-day',
                    to: MY_DAY_PATH,
                    icon: Sun,
                    text: t('Мой день'),
                 },
              ],
           },
        ];

   const close = () => setOpen(false);
   const first = groups[0]?.results[0];

   return (
      <>
         {open &&
            createPortal(
               <div
                  className='bg-navy/45 animate-fade fixed inset-0 z-120 px-4 pt-[12vh]'
                  onMouseDown={(event) => {
                     if (event.target === event.currentTarget) close();
                  }}
               >
                  <div
                     role='dialog'
                     aria-modal
                     aria-label={t('Поиск')}
                     className='border-line-strong shadow-popup animate-pop mx-auto max-w-145 overflow-hidden rounded-xl border bg-white'
                  >
                     <div className='border-line flex items-center gap-2.5 border-b px-4 py-3.5'>
                        <SearchIcon
                           aria-hidden
                           className='text-indigo size-4 shrink-0'
                        />
                        <input
                           autoFocus
                           aria-label={t('Поиск')}
                           className='placeholder:text-ink-faint min-w-0 flex-1 bg-transparent text-[15px] outline-none'
                           placeholder={t('Сделка, задача или раздел меню')}
                           value={query}
                           onChange={(event) => setQuery(event.target.value)}
                           onKeyDown={(event) => {
                              if (event.key !== 'Enter' || !first) return;
                              close();
                              navigate(first.to);
                           }}
                        />
                        <kbd className={KBD}>Esc</kbd>
                     </div>
                     <div className='max-h-[60vh] overflow-auto'>
                        {groups.length ? (
                           groups.map((group) => (
                              <div key={group.label} className='p-2'>
                                 <div className='text-ink-faint px-2.5 py-1.5 text-[11px]'>
                                    {group.label}
                                 </div>
                                 {group.results.map((result) => {
                                    const Icon = result.icon;
                                    return (
                                       <Link
                                          key={result.key}
                                          className='hover:bg-hover flex items-center gap-2.5 rounded-md px-2.5 py-2'
                                          to={result.to}
                                          onClick={close}
                                       >
                                          <Icon
                                             aria-hidden
                                             className='text-ink-soft size-4 shrink-0'
                                          />
                                          <span className='min-w-0 flex-1 truncate'>
                                             {result.text}
                                          </span>
                                          {result.note && (
                                             <span className='text-ink-faint text-xs'>
                                                {result.note}
                                             </span>
                                          )}
                                       </Link>
                                    );
                                 })}
                              </div>
                           ))
                        ) : (
                           <p className='text-ink-soft px-5 py-12 text-center'>
                              {t(
                                 'Ничего не найдено по запросу «{{query}}». Попробуйте название стартапа или раздела.',
                                 { query: query.trim() },
                              )}
                           </p>
                        )}
                     </div>
                  </div>
               </div>,
               document.body,
            )}
      </>
   );
};

export default Search;
