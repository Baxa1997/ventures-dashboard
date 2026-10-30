import type { FilePath } from '@modules/Documents/helpers';
import type { Crumb } from '@modules/Documents/hooks';
import { ChevronRight, HardDrive } from 'lucide-react';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';

interface FileCrumbsProps {
   crumbs: Crumb[];
   onGo: (path: FilePath) => void;
}

const STEP =
   'text-ink-soft hover:bg-ground hover:text-ink inline-flex items-center gap-1.5 rounded-md px-1.5 py-1';

// The way from «Все модули» to the open folder; each step opens its folder.
const FileCrumbs = ({ crumbs, onGo }: FileCrumbsProps) => {
   const { t } = useTranslation('documents');

   return (
      <nav aria-label={t('Путь')} className='min-w-0'>
         <ol className='text-meta flex flex-wrap items-center gap-1'>
            <li>
               {crumbs.length ? (
                  <button
                     type='button'
                     className={STEP}
                     onClick={() => onGo([])}
                  >
                     <HardDrive aria-hidden className='size-3.75' />
                     {t('Все модули')}
                  </button>
               ) : (
                  <span
                     aria-current='page'
                     className='inline-flex items-center gap-1.5 px-1.5 py-1 font-semibold'
                  >
                     <HardDrive aria-hidden className='size-3.75' />
                     {t('Все модули')}
                  </span>
               )}
            </li>
            {crumbs.map((crumb, index) => (
               <Fragment key={crumb.path.join('/')}>
                  <li aria-hidden>
                     <ChevronRight className='text-ink-faint size-3.5' />
                  </li>
                  <li className='min-w-0'>
                     {index === crumbs.length - 1 ? (
                        <span
                           aria-current='page'
                           className='block truncate px-1.5 py-1 font-semibold'
                        >
                           {crumb.label}
                        </span>
                     ) : (
                        <button
                           type='button'
                           className={STEP}
                           onClick={() => onGo(crumb.path)}
                        >
                           {crumb.label}
                        </button>
                     )}
                  </li>
               </Fragment>
            ))}
         </ol>
      </nav>
   );
};

export default FileCrumbs;
