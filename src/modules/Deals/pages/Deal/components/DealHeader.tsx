import {
   countryText,
   headerBadge,
   industryText,
   roundText,
} from '@modules/Deals/helpers';
import { openNewTask } from '@modules/Work/hooks';
import {
   ActionMenu,
   Badge,
   CompanyMark,
   HEAD_BUTTON,
   type MenuAction,
} from '@shared/components';
import type { Deal } from '@shared/types/deals.types';
import {
   ListPlus,
   type LucideIcon,
   MessagesSquare,
   Pencil,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface DealHeaderProps {
   deal: Deal;
   editable: boolean; // the deal is open: its details and stage change
   actions: ReactNode; // the open tab's own buttons
   menu: MenuAction[]; // the deal's steps, under «⋯»
   onEdit: () => void;
   onChat: () => void;
}


/* The deal's head, as the prototype draws it: the company's mark, its name
   and status, a line of what it is, and icon buttons — change its details,
   a new task about it, the team's chat about it — then the open tab's own
   buttons, and under «⋯» the deal's steps: move it on, ask the founder for
   data, put it on another stage, refuse it. */
const DealHeader = ({
   deal,
   editable,
   actions,
   menu,
   onEdit,
   onChat,
}: DealHeaderProps) => {
   const { t } = useTranslation('deals');
   const badge = headerBadge(t, deal);
   const meta = [
      deal.legalName || deal.number,
      industryText(deal),
      roundText(deal),
      deal.city || countryText(deal),
   ]
      .filter(Boolean)
      .join(' · ');

   // a head button: its name on it, what it does on hover
   const icon = (
      name: string,
      hint: string,
      Icon: LucideIcon,
      onClick: () => void,
   ) => (
      <button
         type='button'
         className={HEAD_BUTTON}
         data-hint={hint}
         onClick={onClick}
      >
         <Icon aria-hidden className='text-ink-soft size-4' />
         {name}
      </button>
   );

   return (
      <header className='mb-4 flex flex-wrap items-center gap-x-4 gap-y-3'>
         <CompanyMark large logo={deal.logo} name={deal.company} />
         <div className='min-w-0 flex-[1_1_18rem]'>
            <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
               <h1 className='text-xl leading-7 font-bold'>{deal.company}</h1>
               <Badge tone={badge.tone}>{badge.label}</Badge>
            </div>
            <p className='text-ink-soft text-meta mt-0.5'>{meta}</p>
         </div>
         <div className='print-hidden flex max-w-full flex-wrap items-center gap-2'>
            {editable &&
               icon(
                  t('Изменить'),
                  t('Изменить данные стартапа'),
                  Pencil,
                  onEdit,
               )}
            {icon(t('Задача'), t('Новая задача по сделке'), ListPlus, () =>
               openNewTask({ relation: 'deal', relationId: deal.id }),
            )}
            {icon(
               t('Чат'),
               t('Открыть группу сделки в «Чат и письма»'),
               MessagesSquare,
               onChat,
            )}
            {actions}
            <ActionMenu
               bordered
               actions={menu}
               text={t('Действия')}
               label={t('Действия со сделкой')}
               name={deal.company}
            />
         </div>
      </header>
   );
};

export default DealHeader;
