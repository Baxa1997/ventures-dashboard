import { roundText } from '@modules/Deals/helpers';
import { listName } from '@modules/Settings/services';
import { COMPANY_STATUSES } from '@modules/Portfolio/constants';
import { openNewTask } from '@modules/Work/hooks';
import { Badge, CompanyMark } from '@shared/components';
import { personName } from '@shared/helpers';
import type { Deal } from '@shared/types/deals.types';
import type { PortfolioCompany } from '@shared/types/portfolio.types';
import {
   Handshake,
   ListPlus,
   type LucideIcon,
   Pencil,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

interface CompanyHeaderProps {
   company: PortfolioCompany;
   deal?: Deal; // the deal the company came from
   actions: ReactNode; // what the company's state allows
   onEdit: () => void;
}

const ICON_BUTTON =
   'border-line text-ink-soft hover:bg-hover hover:text-ink grid size-9 shrink-0 place-items-center rounded-lg border bg-white transition-colors';

/* The company's head, as the design draws it: its mark, its name and
   status, a line of what it is, and icon buttons — change its details, a
   new task about it, the deal it came from. The buttons of its state follow
   them. */
const CompanyHeader = ({
   company,
   deal,
   actions,
   onEdit,
}: CompanyHeaderProps) => {
   const { t } = useTranslation('portfolio');
   const status = COMPANY_STATUSES[company.status];
   const meta = [
      listName('industries', company.industryKey) || company.tagline,
      deal && roundText(deal),
      company.countries,
      company.ownerId &&
         t('ответственный {{name}}', { name: personName(company.ownerId) }),
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
         <CompanyMark large name={company.name} />
         <div className='min-w-0 flex-[1_1_18rem]'>
            <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
               <h1 className='text-xl leading-7 font-bold'>{company.name}</h1>
               <Badge tone={status.tone}>{t(status.label)}</Badge>
            </div>
            <p className='text-ink-soft text-meta mt-0.5'>{meta}</p>
         </div>
         <div className='print-hidden flex max-w-full flex-wrap items-center gap-2'>
            {icon(t('Изменить данные'), Pencil, onEdit)}
            {icon(t('Новая задача по компании'), ListPlus, () =>
               openNewTask({ relation: 'portfolio', relationId: company.id }),
            )}
            {company.dealId && (
               <Link
                  aria-label={t('Открыть сделку')}
                  className={ICON_BUTTON}
                  data-hint={t('Открыть сделку этой компании')}
                  to={`/deals/${company.dealId}`}
               >
                  <Handshake aria-hidden className='size-4' />
               </Link>
            )}
            {actions}
         </div>
      </header>
   );
};

export default CompanyHeader;
