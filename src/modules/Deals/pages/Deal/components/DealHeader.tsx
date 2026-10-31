import {
   countryText,
   headerBadge,
   industryText,
   roundText,
} from '@modules/Deals/helpers';
import { openNewTask } from '@modules/Work/hooks';
import { Badge, CompanyMark } from '@shared/components';
import type { Deal } from '@shared/types/deals.types';
import {
   ArrowLeftRight,
   ListPlus,
   type LucideIcon,
   Pencil,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface DealHeaderProps {
   deal: Deal;
   editable: boolean; // the deal is open: its details and stage change
   actions: ReactNode; // the open tab's own buttons
   onEdit: () => void;
   onMove: () => void; // any stage or status
}

const ICON_BUTTON =
   'border-line text-ink-soft hover:bg-hover hover:text-ink grid size-9 shrink-0 place-items-center rounded-lg border bg-white transition-colors';

/* The deal's head, as the prototype draws it: the company's mark, its name
   and status, a line of what it is, and icon buttons — change its details,
   a new task about it, another stage or status. The open tab's own buttons
   follow them. */
const DealHeader = ({
   deal,
   editable,
   actions,
   onEdit,
   onMove,
}: DealHeaderProps) => {
   const { t } = useTranslation('deals');
   const badge = headerBadge(t, deal);
   const meta = [
      deal.number,
      industryText(deal),
      roundText(deal),
      countryText(deal),
   ]
      .filter(Boolean)
      .join(' · ');

   const icon = (label: string, Icon: LucideIcon, onClick: () => void) => (
      <button
         type='button'
         aria-label={label}
         className={ICON_BUTTON}
         data-hint={label}
         onClick={onClick}
      >
         <Icon aria-hidden className='size-4' />
      </button>
   );

   return (
      <header className='mb-4 flex flex-wrap items-center gap-x-4 gap-y-3'>
         <CompanyMark large name={deal.company} />
         <div className='min-w-0 flex-[1_1_18rem]'>
            <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
               <h1 className='text-xl leading-7 font-bold'>{deal.company}</h1>
               <Badge tone={badge.tone}>{badge.label}</Badge>
            </div>
            <p className='text-ink-soft text-meta mt-0.5'>{meta}</p>
         </div>
         <div className='print-hidden flex max-w-full flex-wrap items-center gap-2'>
            {editable && icon(t('Изменить данные'), Pencil, onEdit)}
            {icon(t('Новая задача по сделке'), ListPlus, () =>
               openNewTask({ relation: 'deal', relationId: deal.id }),
            )}
            {deal.status !== 'portfolio' &&
               icon(t('Сменить этап или статус'), ArrowLeftRight, onMove)}
            {actions}
         </div>
      </header>
   );
};

export default DealHeader;
