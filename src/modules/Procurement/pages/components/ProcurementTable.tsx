import {
   approverOf,
   isClosed,
   nextStageOf,
   stagesFor,
   waitsApproval,
} from '@modules/Procurement/helpers';
import { listName, nameOf, vendorName } from '@modules/Settings/services';
import {
   Badge,
   Button,
   Card,
   ItemActions,
   NoData,
   Table,
   TD,
   TH,
} from '@shared/components';
import {
   formatMoneyShort,
   formatNumericDate,
   formatUsd,
   personName,
} from '@shared/helpers';
import { useCurrentUser } from '@shared/hooks';
import type { Procurement } from '@shared/types/procurement.types';
import clsx from 'clsx';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ProcurementTableProps {
   requests: Procurement[];
   onOpen: (request: Procurement) => void;
   onDelete: (request: Procurement) => void;
   onNext: (request: Procurement) => void; // on to the next stage
}

const CLOSED_COLOR = '#1f9d6b';

// The stage's pill, and a bar per stage: those passed pale, the current one
// full, all green once the request is closed.
const StageSteps = ({ request }: { request: Procurement }) => {
   const { t } = useTranslation('procurement');
   const stages = stagesFor(request.stage);
   const index = stages.findIndex(({ key }) => key === request.stage);
   const closed = isClosed(request);
   const current = stages[index];

   return (
      <>
         <Badge color={closed ? CLOSED_COLOR : current?.color} tone='neutral'>
            {current ? nameOf(current) : request.stage}
         </Badge>
         <span
            className='mt-1.5 flex gap-1'
            title={t('Этап {{index}} из {{total}}', {
               index: index + 1,
               total: stages.length,
            })}
         >
            {stages.map(({ key, color }, position) => {
               const fill = closed ? CLOSED_COLOR : (color ?? '');
               return (
                  <i
                     key={key}
                     className='h-1.25 w-3.5 rounded-full'
                     style={{
                        background:
                           position === index
                              ? fill
                              : position < index
                                ? `color-mix(in srgb, ${fill} 45%, white)`
                                : 'var(--color-line)',
                     }}
                  />
               );
            })}
         </span>
      </>
   );
};

// «Таблица», as the design draws it: a row opens the request's form, its button
// takes it on to the next stage.
const ProcurementTable = ({
   requests,
   onOpen,
   onDelete,
   onNext,
}: ProcurementTableProps) => {
   const { t, i18n } = useTranslation('procurement');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const user = useCurrentUser();

   return (
      <Card>
         {requests.length ? (
            <Table
               className='min-w-[60rem]'
               head={
                  <>
                     <th className={TH}>{t('Закупка')}</th>
                     <th className={TH}>{t('Категория')}</th>
                     <th className={clsx(TH, 'text-right')}>{t('Сумма')}</th>
                     <th className={TH}>{t('Поставщик')}</th>
                     <th className={TH}>{t('Этап')}</th>
                     <th className={TH}>
                        <span className='sr-only'>{t('Действия')}</span>
                     </th>
                  </>
               }
            >
               {requests.map((request) => {
                  const next = nextStageOf(request);
                  const waits = waitsApproval(request);
                  const approver = approverOf(request);
                  const vendor = vendorName(request.vendorId);
                  const returned = request.decisionNote && !request.approvedBy;
                  return (
                     <tr
                        key={request.id}
                        className='hover:bg-hover cursor-pointer'
                        onClick={() => onOpen(request)}
                     >
                        <td className={TD}>
                           <button
                              type='button'
                              className='text-left font-semibold'
                              onClick={(event) => {
                                 event.stopPropagation();
                                 onOpen(request);
                              }}
                           >
                              {request.title}
                           </button>
                           <div className='text-ink-faint mt-0.5 text-xs'>
                              {[
                                 t('от {{date}}', {
                                    date: formatNumericDate(request.date),
                                 }),
                                 request.needDate &&
                                    t('нужно к {{date}}', {
                                       date: formatNumericDate(request.needDate),
                                    }),
                              ]
                                 .filter(Boolean)
                                 .join(' · ')}
                           </div>
                           {returned && (
                              <div className='text-danger mt-0.5 text-xs'>
                                 {t('Возвращена инициатору: {{note}}', {
                                    note: request.decisionNote,
                                 })}
                              </div>
                           )}
                        </td>
                        <td className={TD}>
                           <div>
                              {listName('procCategories', request.category)}
                           </div>
                           <div className='text-ink-faint mt-0.5 text-xs'>
                              {personName(request.ownerId)}
                           </div>
                        </td>
                        <td
                           className={clsx(
                              TD,
                              'text-right whitespace-nowrap tabular-nums',
                           )}
                        >
                           {formatUsd(request.amount, language)}
                        </td>
                        <td className={TD}>
                           {vendor || <span className='text-ink-faint'>—</span>}
                        </td>
                        <td className={clsx(TD, 'whitespace-nowrap')}>
                           <StageSteps request={request} />
                           {waits && (
                              <div className='text-danger mt-1 text-xs'>
                                 {t('ждёт решения: {{name}}', {
                                    name: personName(approver),
                                 })}
                              </div>
                           )}
                        </td>
                        <td
                           className={clsx(TD, 'whitespace-nowrap')}
                           onClick={(event) => event.stopPropagation()}
                        >
                           <div className='flex items-center justify-end gap-1'>
                              {next ? (
                                 <Button
                                    disabled={waits && approver !== user.id}
                                    size='sm'
                                    title={t('Перевести на этап «{{stage}}»', {
                                       stage: nameOf(next),
                                    })}
                                    variant='ghost'
                                    onClick={() => onNext(request)}
                                 >
                                    {waits
                                       ? approver === user.id
                                          ? t('Согласовать')
                                          : t('Ждёт согласования')
                                       : nameOf(next)}
                                    <ArrowRight aria-hidden />
                                 </Button>
                              ) : (
                                 <Badge tone='success'>{t('Закрыта')}</Badge>
                              )}
                              <ItemActions
                                 icons
                                 name={request.title}
                                 onDelete={() => onDelete(request)}
                                 onEdit={() => onOpen(request)}
                              />
                           </div>
                        </td>
                     </tr>
                  );
               })}
            </Table>
         ) : (
            <NoData>{t('Закупок по этим условиям нет.')}</NoData>
         )}
         <div className='border-line text-ink-soft flex flex-wrap justify-between gap-x-4 gap-y-1 border-t px-4.5 py-2.5 text-xs'>
            <span>
               {t('{{count}} заявка', { count: requests.length })} ·{' '}
               {formatMoneyShort(
                  requests.reduce((sum, { amount }) => sum + amount, 0),
               )}
            </span>
            <span>
               {t('Закупки дороже лимита категории согласует генеральный директор')}
            </span>
         </div>
      </Card>
   );
};

export default ProcurementTable;
