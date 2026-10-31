import { CABINET_ROLES } from '@modules/Portfolio/constants';
import { Avatar, Badge, Card, NoData } from '@shared/components';
import type { Deal } from '@shared/types/deals.types';
import type { CabinetMember } from '@shared/types/portfolio.types';
import { useTranslation } from 'react-i18next';

interface CabinetCardProps {
   deal: Deal;
}

/* «Команда в кабинете основателя», as the design has it: the applicant, who
   owns the cabinet, and the people they added there, each with their role and
   whether their access is on. The startup's CEO changes them in the cabinet. */
const CabinetCard = ({ deal }: CabinetCardProps) => {
   const { t } = useTranslation('deals');
   const { t: tp } = useTranslation('portfolio');
   const people: Pick<CabinetMember, 'name' | 'email' | 'role' | 'active'>[] =
      deal.applicationId
         ? [
              {
                 name: deal.applicantName ?? deal.company,
                 email: deal.applicantEmail ?? '',
                 role: 'ceo',
                 active: true,
              },
              ...(deal.cabinet ?? []),
           ]
         : [];

   return (
      <Card
         hint={people.length ? String(people.length) : undefined}
         title={t('Команда в кабинете основателя')}
      >
         {people.length ? (
            <ul className='divide-line divide-y'>
               {people.map((person) => (
                  <li
                     key={person.email}
                     className='flex items-center gap-3 px-4.5 py-3'
                  >
                     <Avatar name={person.name} />
                     <div className='min-w-0 flex-1'>
                        <div className='truncate font-medium'>
                           {person.name}
                        </div>
                        <div className='text-ink-soft truncate text-xs'>
                           {person.email}
                        </div>
                     </div>
                     <Badge tone='accent'>
                        {tp(CABINET_ROLES[person.role])}
                     </Badge>
                     {!person.active && (
                        <Badge tone='neutral'>
                           {t('Доступ приостановлен')}
                        </Badge>
                     )}
                  </li>
               ))}
            </ul>
         ) : (
            <NoData>{t('Основатели ещё не вошли в кабинет.')}</NoData>
         )}
      </Card>
   );
};

export default CabinetCard;
