import { roundText } from '@modules/Deals/helpers';
import { listName } from '@modules/Settings/services';
import { COMPANY_STATUSES } from '@modules/Portfolio/constants';
import { openNewTask } from '@modules/Work/hooks';
import {
   ActionMenu,
   Badge,
   CompanyMark,
   HEAD_BUTTON,
   type MenuAction,
} from '@shared/components';
import { personName } from '@shared/helpers';
import type { Deal } from '@shared/types/deals.types';
import type { PortfolioCompany } from '@shared/types/portfolio.types';
import {
   ListPlus,
   type LucideIcon,
   MessagesSquare,
   Pencil,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CompanyHeaderProps {
   company: PortfolioCompany;
   deal?: Deal; // the deal the company came from
   menu: MenuAction[]; // what the company's state allows, under «⋯»
   onEdit: () => void;
   onChat?: () => void; // the team's chat of its deal; none without a deal
}


/* The company's head, as the deal's: its mark, its name and status, a line
   of what it is, and icon buttons — change its details, a new task about
   it, the team's chat of its deal — then «⋯» with the steps its state
   allows. */
const CompanyHeader = ({
   company,
   deal,
   menu,
   onEdit,
   onChat,
}: CompanyHeaderProps) => {
   const { t } = useTranslation('portfolio');
   const status = COMPANY_STATUSES[company.status];
   const meta = [
      deal?.legalName,
      listName('industries', company.industryKey) || company.tagline,
      deal && roundText(deal),
      deal?.city || company.countries,
      company.ownerId &&
         t('ответственный {{name}}', { name: personName(company.ownerId) }),
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
         <CompanyMark large logo={deal?.logo} name={company.name} />
         <div className='min-w-0 flex-[1_1_18rem]'>
            <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
               <h1 className='text-xl leading-7 font-bold'>{company.name}</h1>
               <Badge tone={status.tone}>{t(status.label)}</Badge>
            </div>
            <p className='text-ink-soft text-meta mt-0.5'>{meta}</p>
         </div>
         <div className='print-hidden flex max-w-full flex-wrap items-center gap-2'>
            {icon(t('Изменить'), t('Изменить данные компании'), Pencil, onEdit)}
            {icon(t('Задача'), t('Новая задача по компании'), ListPlus, () =>
               openNewTask({ relation: 'portfolio', relationId: company.id }),
            )}
            {onChat &&
               icon(
                  t('Чат'),
                  t('Открыть группу сделки в «Чат и письма»'),
                  MessagesSquare,
                  onChat,
               )}
            <ActionMenu
               bordered
               actions={menu}
               text={t('Действия')}
               label={t('Действия с компанией')}
               name={company.name}
            />
         </div>
      </header>
   );
};

export default CompanyHeader;
