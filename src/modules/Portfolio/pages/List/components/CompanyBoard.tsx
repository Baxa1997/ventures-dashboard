import { listName } from '@modules/Settings/services';
import { PORTFOLIO_PATH } from '@modules/Portfolio/constants';
import {
   formatMoic,
   formatStake,
   positionOf,
} from '@modules/Portfolio/helpers';
import { BoardGap, CompanyMark, TONE_COLORS } from '@shared/components';
import { formatDayYear, formatMoneyShort } from '@shared/helpers';
import { type BoardPlace, useBoardDrag } from '@shared/hooks';
import type { PortfolioCompany } from '@shared/types/portfolio.types';
import clsx from 'clsx';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

type Column = 'active' | 'exits';

const COLUMNS = [
   { id: 'active', label: 'Активные', color: TONE_COLORS.success },
   { id: 'exits', label: 'Выходы', color: TONE_COLORS.info },
] as const satisfies { id: Column; label: string; color: string }[];

const columnOf = ({ status }: PortfolioCompany): Column =>
   status === 'active' ? 'active' : 'exits';

interface CompanyBoardProps {
   companies: PortfolioCompany[];
   onExit: (company: PortfolioCompany) => void; // carried to «Выходы»
   onReopen: (company: PortfolioCompany) => void; // carried back
}

// What a company's card shows: the company, what was invested and its
// MOIC, then its stake and worth, or its exit.
const CardFace = ({
   company,
   lifted = false,
}: {
   company: PortfolioCompany;
   lifted?: boolean;
}) => {
   const { t, i18n } = useTranslation('portfolio');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const position = positionOf(company);

   return (
      <div
         className={clsx(
            'border-line grid grid-cols-[minmax(0,1fr)] gap-2 rounded-lg border bg-white px-3 py-2.75',
            lifted
               ? 'shadow-popup animate-lift scale-[1.02] rotate-2'
               : 'hover:border-line-strong hover:shadow-raised transition-shadow',
         )}
      >
         <div className='flex items-center gap-2.5'>
            <CompanyMark name={company.name} />
            <div className='min-w-0'>
               <div className='truncate font-bold'>{company.name}</div>
               <div className='text-ink-faint truncate text-xs'>
                  {listName('industries', company.industryKey) ||
                     company.tagline}
               </div>
            </div>
         </div>
         <div className='text-ink-faint flex items-center justify-between gap-2 text-xs tabular-nums'>
            <span>
               {t('Вложено {{amount}}', {
                  amount: formatMoneyShort(company.invested),
               })}
            </span>
            {position.moic !== null && (
               <b
                  className={
                     position.moic >= 1 ? 'text-success' : 'text-danger'
                  }
               >
                  {formatMoic(position.moic, language)}
               </b>
            )}
         </div>
         <div className='text-ink-faint text-xs tabular-nums'>
            {company.status === 'active'
               ? [
                    position.stake !== null &&
                       t('Доля {{stake}}', {
                          stake: formatStake(position.stake, language),
                       }),
                    position.value !== null &&
                       formatMoneyShort(position.value),
                 ]
                    .filter(Boolean)
                    .join(' · ') || t('Оценка не внесена')
               : [
                    company.status === 'written_off'
                       ? t('Списана')
                       : t('Выход'),
                    company.exit?.date && formatDayYear(company.exit.date),
                    position.value !== null &&
                       formatMoneyShort(position.value),
                 ]
                    .filter(Boolean)
                    .join(' · ')}
         </div>
      </div>
   );
};

/* «Канбан», as the design draws it: the active companies and the exits.
   A card carried to «Выходы» asks how the fund left the company; carried
   back, it asks to make the company active again. */
const CompanyBoard = ({ companies, onExit, onReopen }: CompanyBoardProps) => {
   const { t } = useTranslation('portfolio');
   const navigate = useNavigate();
   const { board, carried, press, clickable } = useBoardDrag(
      (company: PortfolioCompany, { column }: BoardPlace) => {
         if (column === columnOf(company)) return;
         if (column === 'exits') onExit(company);
         else onReopen(company);
      },
   );

   return (
      <>
         <div
            ref={board}
            className='grid auto-cols-[minmax(17.5rem,1fr)] grid-flow-col items-start gap-3 overflow-x-auto pb-2'
         >
            {COLUMNS.map((column) => {
               const cards = companies.filter(
                  (company) => columnOf(company) === column.id,
               );
               const shown = cards.filter(
                  ({ id }) => id !== carried?.item.id,
               );
               // the gap opens in the other column, where the card would go
               const over =
                  !!carried &&
                  carried.over?.column === column.id &&
                  columnOf(carried.item) !== column.id;
               const height = carried?.height ?? 0;
               return (
                  <section
                     key={column.id}
                     aria-label={t(column.label)}
                     className={clsx(
                        'border-line min-w-0 rounded-xl border border-t-3 transition-colors',
                        over ? 'bg-ground' : 'bg-white',
                     )}
                     data-column={column.id}
                     style={{ borderTopColor: column.color }}
                  >
                     <header className='text-meta flex justify-between px-3.5 py-2.75 font-bold'>
                        <span>{t(column.label)}</span>
                        <span className='text-ink-faint font-medium tabular-nums'>
                           {cards.length}
                        </span>
                     </header>
                     <ul className='grid min-h-12.5 grid-cols-[minmax(0,1fr)] gap-2 px-2 pb-2'>
                        {shown.map((company) => (
                           <li
                              key={company.id}
                              className='cursor-grab select-none'
                              data-card={company.id}
                              onClick={() =>
                                 clickable() &&
                                 navigate(`${PORTFOLIO_PATH}/${company.id}`)
                              }
                              onPointerDown={(event) => press(company, event)}
                           >
                              <button
                                 type='button'
                                 aria-label={company.name}
                                 className='block w-full text-left'
                              >
                                 <CardFace company={company} />
                              </button>
                           </li>
                        ))}
                        {over && <BoardGap height={height} />}
                     </ul>
                  </section>
               );
            })}
         </div>
         <p className='text-ink-soft mt-2.5 text-xs'>
            {t(
               'Перетащите карточку в «Выходы», чтобы зафиксировать выход, или обратно в «Активные».',
            )}
         </p>
         {carried &&
            createPortal(
               <div
                  aria-hidden
                  className='pointer-events-none fixed z-120'
                  style={{
                     left: carried.x - carried.dx,
                     top: carried.y - carried.dy,
                     width: carried.width,
                  }}
               >
                  <CardFace lifted company={carried.item} />
               </div>,
               document.body,
            )}
      </>
   );
};

export default CompanyBoard;
