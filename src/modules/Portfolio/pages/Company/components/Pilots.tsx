import PilotDialog from '@modules/Portfolio/components/PilotDialog';
import { PILOT_STATUSES } from '@modules/Portfolio/constants';
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
import type { Pilot, PortfolioCompany } from '@shared/types/portfolio.types';
import clsx from 'clsx';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface PilotsProps {
   company: PortfolioCompany;
}

/* «Пилоты SQB»: the company's pilots with the bank's business lines and its
   clients, each added, changed and deleted (after asking) here. */
const Pilots = ({ company }: PilotsProps) => {
   const { t } = useTranslation('portfolio');
   const [editing, setEditing] = useState<Pilot | 'new' | null>(null);
   const [removing, setRemoving] = useState<Pilot | null>(null);
   const dates = (pilot: Pilot) =>
      pilot.startedAt || pilot.endedAt
         ? `${formatDayYear(pilot.startedAt)} – ${formatDayYear(pilot.endedAt)}`
         : '—';

   return (
      <Card
         action={
            <button
               type='button'
               className='link'
               data-hint={t('Добавить пилот этой компании')}
               onClick={() => setEditing('new')}
            >
               {t('Новый пилот')}
            </button>
         }
         className='flex flex-1 flex-col'
         hint={company.pilots.length || undefined}
         title={t('Пилоты в SQB и у клиентов банка')}
      >
         {company.pilots.length ? (
            <Table
               className='min-w-3xl'
               head={
                  <>
                     <th className={TH}>{t('Пилот')}</th>
                     <th className={TH}>{t('Подразделение SQB или клиент')}</th>
                     <th className={TH}>{t('Сроки')}</th>
                     <th className={TH}>{t('Цель или результат')}</th>
                     <th className={TH}>{t('Статус')}</th>
                     <th
                        aria-label={t('Действия')}
                        className={clsx(TH, 'w-20')}
                     />
                  </>
               }
            >
               {company.pilots.map((pilot) => (
                  <tr key={pilot.id}>
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
                     <td className={TD}>
                        <ItemActions
                           icons
                           name={pilot.title}
                           onDelete={() => setRemoving(pilot)}
                           onEdit={() => setEditing(pilot)}
                        />
                     </td>
                  </tr>
               ))}
            </Table>
         ) : (
            <NoData>{t('Пилотов с банком пока нет. Добавьте первый.')}</NoData>
         )}
         <PilotDialog
            companyId={company.id}
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
            onConfirm={() => removing && portfolio.removePilot(removing.id)}
         >
            <p>{t('Пилот удалится из карточки компании.')}</p>
         </ConfirmDialog>
      </Card>
   );
};

export default Pilots;
