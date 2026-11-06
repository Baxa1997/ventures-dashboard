import PilotDialog from '@modules/Portfolio/components/PilotDialog';
import { PILOT_STATUSES } from '@modules/Portfolio/constants';
import portfolio from '@modules/Portfolio/services';
import {
   Badge,
   Button,
   Card,
   ConfirmDialog,
   NoData,
   Table,
   TD,
   TH,
} from '@shared/components';
import {
   formatMoneyShort,
   formatNumericDate,
   formatUsd,
} from '@shared/helpers';
import type { Pilot, PortfolioCompany } from '@shared/types/portfolio.types';
import clsx from 'clsx';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface PilotsProps {
   company: PortfolioCompany;
   fields: boolean; // ucode has a pilot's sponsor and budget (batch 24)
}

/* «Пилоты SQB», as the prototype draws them: the company's pilots in the
   bank's business lines and with its corporate clients — who backs each in
   the bank, when it runs, its budget, its aim or result and its status —
   and under them how many there are and their budget. A row opens the
   pilot's window, where it is changed or deleted (after asking). */
const Pilots = ({ company, fields }: PilotsProps) => {
   const { t, i18n } = useTranslation('portfolio');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const [editing, setEditing] = useState<Pilot | 'new' | null>(null);
   const [removing, setRemoving] = useState<Pilot | null>(null);
   const pilots = company.pilots;
   const budget = pilots.reduce((sum, pilot) => sum + (pilot.budget ?? 0), 0);
   const dates = (pilot: Pilot) =>
      pilot.startedAt || pilot.endedAt
         ? `${formatNumericDate(pilot.startedAt)} – ${formatNumericDate(pilot.endedAt)}`
         : '—';

   return (
      <div className='gap-section flex flex-col'>
         <div className='flex flex-wrap items-center justify-between gap-3'>
            <p className='text-ink-soft text-meta'>
               {t(
                  'Пилоты {{company}} в подразделениях SQB и у корпоративных клиентов банка.',
                  { company: company.name },
               )}
            </p>
            <Button
               hint={t('Добавить пилот этой компании')}
               onClick={() => setEditing('new')}
            >
               <Plus aria-hidden />
               {t('Новый пилот')}
            </Button>
         </div>
         <Card>
            {pilots.length ? (
               <>
                  <Table
                     className='min-w-4xl'
                     head={
                        <>
                           <th className={TH}>{t('Пилот')}</th>
                           <th className={TH}>{t('Подразделение SQB')}</th>
                           <th className={TH}>{t('Спонсор')}</th>
                           <th className={TH}>{t('Сроки')}</th>
                           <th className={clsx(TH, 'text-right')}>
                              {t('Бюджет')}
                           </th>
                           <th className={TH}>{t('Цель / результат')}</th>
                           <th className={TH}>{t('Статус')}</th>
                        </>
                     }
                  >
                     {pilots.map((pilot) => (
                        <tr
                           key={pilot.id}
                           className='hover:bg-hover cursor-pointer'
                           tabIndex={0}
                           onClick={() => setEditing(pilot)}
                           onKeyDown={(event) => {
                              if (event.key !== 'Enter' && event.key !== ' ')
                                 return;
                              event.preventDefault();
                              setEditing(pilot);
                           }}
                        >
                           <td className={clsx(TD, 'min-w-44 font-semibold')}>
                              {pilot.title}
                           </td>
                           <td className={clsx(TD, 'min-w-32')}>
                              {pilot.customer || '—'}
                           </td>
                           <td className={TD}>{pilot.sponsor || '—'}</td>
                           <td
                              className={clsx(
                                 TD,
                                 'whitespace-nowrap tabular-nums',
                              )}
                           >
                              {dates(pilot)}
                           </td>
                           <td
                              className={clsx(
                                 TD,
                                 'text-right whitespace-nowrap tabular-nums',
                              )}
                           >
                              {pilot.budget === null
                                 ? '—'
                                 : formatUsd(pilot.budget, language)}
                           </td>
                           <td className={clsx(TD, 'min-w-44')}>
                              {pilot.note || '—'}
                           </td>
                           <td className={clsx(TD, 'whitespace-nowrap')}>
                              <Badge tone={PILOT_STATUSES[pilot.status].tone}>
                                 {t(PILOT_STATUSES[pilot.status].label)}
                              </Badge>
                           </td>
                        </tr>
                     ))}
                  </Table>
                  <footer className='border-line text-ink-soft border-t px-4.5 py-2.5 text-xs'>
                     {[
                        t('{{count}} пилот', { count: pilots.length }),
                        budget > 0 &&
                           t('бюджет {{sum}}', {
                              sum: formatMoneyShort(budget),
                           }),
                     ]
                        .filter(Boolean)
                        .join(' · ')}
                  </footer>
               </>
            ) : (
               <NoData>
                  {t('Пилотов с банком пока нет. Добавьте первый.')}
               </NoData>
            )}
         </Card>
         <PilotDialog
            companyId={company.id}
            fields={fields}
            pilot={editing}
            onClose={() => setEditing(null)}
            onRemove={setRemoving}
         />
         <ConfirmDialog
            open={removing !== null}
            success={t('Пилот удалён')}
            title={t('Удалить пилот «{{title}}»?', {
               title: removing?.title ?? '',
            })}
            onClose={() => setRemoving(null)}
            onConfirm={async () => {
               if (!removing) return;
               await portfolio.removePilot(removing.id);
               setEditing(null);
            }}
         >
            <p>{t('Пилот удалится из карточки компании.')}</p>
         </ConfirmDialog>
      </div>
   );
};

export default Pilots;
