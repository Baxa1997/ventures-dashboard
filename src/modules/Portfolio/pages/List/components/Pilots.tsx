import PilotDialog from '@modules/Portfolio/components/PilotDialog';
import { PILOT_STATUSES, PORTFOLIO_PATH } from '@modules/Portfolio/constants';
import type { PortfolioData } from '@modules/Portfolio/hooks';
import portfolio from '@modules/Portfolio/services';
import {
   Badge,
   Card,
   ConfirmDialog,
   ItemActions,
   NoData,
   Table,
   TD,
   TH,
} from '@shared/components';
import { formatDayYear } from '@shared/helpers';
import type { Pilot } from '@shared/types/portfolio.types';
import clsx from 'clsx';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

interface PilotsProps {
   data: PortfolioData;
   companyId?: string; // only this company's pilots, on its card, kept there
}

/* Pilots of the portfolio companies with the bank's business lines and its
   clients. On a company's card they are added, changed and deleted (after
   asking); the list of all of them leads to the companies. */
const Pilots = ({ data, companyId }: PilotsProps) => {
   const { t } = useTranslation('portfolio');
   const [editing, setEditing] = useState<Pilot | 'new' | null>(null);
   const [removing, setRemoving] = useState<Pilot | null>(null);
   const companies = data.companies.filter(
      ({ id, pilots }) =>
         (pilots.length || id === companyId) &&
         (!companyId || id === companyId),
   );
   const rows = companies.flatMap((company) =>
      company.pilots.map((pilot) => ({ company, pilot })),
   );
   const dates = (pilot: Pilot) =>
      pilot.startedAt || pilot.endedAt
         ? `${formatDayYear(pilot.startedAt)} – ${formatDayYear(pilot.endedAt)}`
         : '—';

   return (
      <Card
         action={
            companyId && (
               <button
                  type='button'
                  className='link'
                  onClick={() => setEditing('new')}
               >
                  {t('Новый пилот')}
               </button>
            )
         }
         className='flex flex-1 flex-col'
         hint={rows.length || undefined}
         title={
            companyId ? t('Пилоты в SQB и у клиентов банка') : t('Все пилоты')
         }
      >
         {rows.length ? (
            <Table
               className='min-w-3xl'
               head={
                  <>
                     {!companyId && <th className={TH}>{t('Компания')}</th>}
                     <th className={TH}>{t('Пилот')}</th>
                     <th className={TH}>{t('Подразделение SQB или клиент')}</th>
                     <th className={TH}>{t('Сроки')}</th>
                     <th className={TH}>{t('Цель или результат')}</th>
                     <th className={TH}>{t('Статус')}</th>
                     {companyId && (
                        <th
                           aria-label={t('Действия')}
                           className={clsx(TH, 'w-20')}
                        />
                     )}
                  </>
               }
            >
               {rows.map(({ company, pilot }) => (
                  <tr key={pilot.id}>
                     {!companyId && (
                        <td className={TD}>
                           <Link
                              className='text-sm font-semibold hover:underline'
                              to={`${PORTFOLIO_PATH}/${company.id}?tab=pilots`}
                           >
                              {company.name}
                           </Link>
                        </td>
                     )}
                     <td className={clsx(TD, 'font-medium')}>{pilot.title}</td>
                     <td className={clsx(TD, 'text-ink-soft')}>
                        {pilot.customer}
                     </td>
                     <td
                        className={clsx(
                           TD,
                           'text-ink-soft whitespace-nowrap tabular-nums',
                        )}
                     >
                        {dates(pilot)}
                     </td>
                     <td className={clsx(TD, 'min-w-48')}>
                        {pilot.note || '—'}
                     </td>
                     <td className={TD}>
                        <Badge tone={PILOT_STATUSES[pilot.status].tone}>
                           {t(PILOT_STATUSES[pilot.status].label)}
                        </Badge>
                     </td>
                     {companyId && (
                        <td className={TD}>
                           <ItemActions
                              icons
                              name={pilot.title}
                              onDelete={() => setRemoving(pilot)}
                              onEdit={() => setEditing(pilot)}
                           />
                        </td>
                     )}
                  </tr>
               ))}
            </Table>
         ) : (
            <NoData>
               {companyId
                  ? t('Пилотов с банком пока нет. Добавьте первый.')
                  : t('Пилотов с банком пока нет')}
            </NoData>
         )}
         {companyId && (
            <>
               <PilotDialog
                  companyId={companyId}
                  pilot={editing}
                  onClose={() => setEditing(null)}
               />
               <ConfirmDialog
                  open={removing !== null}
                  success={t('Пилот удалён')}
                  title={t('Удалить пилот «{{title}}»?', {
                     title: removing?.title ?? '',
                  })}
                  onClose={() => setRemoving(null)}
                  onConfirm={() =>
                     removing && portfolio.removePilot(removing.id)
                  }
               >
                  <p>{t('Пилот удалится из карточки компании.')}</p>
               </ConfirmDialog>
            </>
         )}
      </Card>
   );
};

export default Pilots;
