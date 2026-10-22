import { ALL } from '@modules/Deals/constants';
import {
   checkMandate,
   dayOf,
   factRows,
   formatAmount,
   formatStamp,
   industryText,
   sourceFrom,
   sourceLine,
   type MandateState,
   mandateTone,
   timeOf,
   triageDue,
   triageState,
} from '@modules/Deals/helpers';
import deals from '@modules/Deals/services';
import {
   Badge,
   Button,
   Card,
   FactList,
   FilterBar,
   FilterSelect,
   NoData,
   SearchField,
} from '@shared/components';
import { TEAM } from '@shared/constants';
import { formatDay, shortName } from '@shared/helpers';
import { useCurrentUser } from '@shared/hooks';
import type { Deal, DealsSummary } from '@shared/types/deals.types';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { Check, TriangleAlert, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import {
   matches,
   matchesSearch,
   matchesSource,
   sourceOptions,
} from '../helpers';

interface InboxProps {
   deals: Deal[];
   summary: DealsSummary;
   onVisible: (rows: Deal[]) => void;
   onRequest: (deal: Deal) => void;
   onReject: (deal: Deal) => void;
}

type Assignment = typeof ALL | 'unassigned' | 'assigned';

const TH = 'px-3 py-2.5 text-xs font-normal text-ink-soft';

const MARKS = {
   ok: { icon: Check, className: 'text-success-ink' },
   attention: { icon: TriangleAlert, className: 'text-warning-ink' },
   fail: { icon: X, className: 'text-danger' },
};

const TRIAGE_CLASSES = {
   waiting: 'text-warning-ink',
   overdue: 'text-danger',
   today: 'text-warning-ink',
   ahead: '',
};

// Incoming applications waiting for a decision, and the one that is open.
const Inbox = ({
   deals: all,
   summary,
   onVisible,
   onRequest,
   onReject,
}: InboxProps) => {
   const { t, i18n } = useTranslation('deals');
   const user = useCurrentUser();
   const language = i18n.resolvedLanguage ?? i18n.language;
   const [search, setSearch] = useState('');
   const [source, setSource] = useState<string>(ALL);
   const [mandate, setMandate] = useState<MandateState | typeof ALL>(ALL);
   const [assignment, setAssignment] = useState<Assignment>('unassigned');
   const [selectedId, setSelectedId] = useState('');
   const [ownerId, setOwnerId] = useState('');

   const inbox = useMemo(
      () =>
         all
            .filter(({ status }) => status === 'review')
            .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)),
      [all],
   );
   const rows = useMemo(
      () =>
         inbox.filter(
            (deal) =>
               matchesSearch(deal, search) &&
               matchesSource(source, deal) &&
               matches(
                  mandate,
                  checkMandate(t, deal, language).verdict.state,
               ) &&
               (assignment === ALL ||
                  (assignment === 'assigned') === !!deal.ownerId),
         ),
      [inbox, search, source, mandate, assignment, t, language],
   );
   const selected = rows.find(({ id }) => id === selectedId) ?? rows[0];

   useEffect(() => onVisible(rows), [rows, onVisible]);
   // each application starts with the owner it was offered to; the website
   // offers it to nobody, so then the person deciding takes it
   useEffect(() => {
      setOwnerId(
         selected
            ? selected.ownerId || selected.proposedOwnerId || user.id
            : '',
      );
   }, [selected?.id]);

   const showAll = () => {
      setSearch('');
      setSource(ALL);
      setMandate(ALL);
      setAssignment(ALL);
   };

   const triageText = (deal: Deal) => {
      const state = triageState(deal);
      if (state === 'waiting') return t('ждём заявителя');
      if (state === 'overdue') return t('просрочено');
      if (state === 'today') return t('сегодня');
      return t('до {{date}}', { date: formatDay(triageDue(deal)) });
   };

   const check = selected && checkMandate(t, selected, language);

   return (
      <>
         <FilterBar>
            <SearchField
               label={t('Компания, номер заявки')}
               value={search}
               onChange={setSearch}
            />
            <FilterSelect
               label={t('Источник')}
               options={[
                  { value: ALL, label: t('Все источники') },
                  ...sourceOptions(t),
               ]}
               showLabel={false}
               value={source}
               onChange={setSource}
            />
            <FilterSelect
               label={t('Мандат')}
               options={[
                  { value: ALL, label: t('все') },
                  { value: 'ok', label: t('соответствует') },
                  { value: 'attention', label: t('нужно проверить') },
                  { value: 'fail', label: t('не проходит') },
               ]}
               value={mandate}
               onChange={setMandate}
            />
            <FilterSelect
               accent={assignment !== ALL}
               label={t('Владелец')}
               options={[
                  { value: 'unassigned', label: t('Не назначены') },
                  { value: 'assigned', label: t('Назначены') },
                  { value: ALL, label: t('Все заявки') },
               ]}
               showLabel={false}
               value={assignment}
               onChange={setAssignment}
            />
         </FilterBar>

         <div className='mt-section gap-section grid flex-1 xl:grid-cols-[minmax(0,1fr)_23.75rem]'>
            <Card className='flex flex-col overflow-hidden'>
               {rows.length ? (
                  <div className='overflow-x-auto'>
                     <table className='text-meta w-full min-w-2xl border-collapse text-left'>
                        <thead>
                           <tr className='border-line border-b'>
                              <th className={`${TH} pl-5`}>{t('Заявка')}</th>
                              <th className={TH}>{t('Источник')}</th>
                              <th className={`${TH} text-right`}>
                                 {t('Запрос')}
                              </th>
                              <th className={TH}>{t('Проверка мандата')}</th>
                              <th className={`${TH} pr-5`}>{t('Разобрать')}</th>
                           </tr>
                        </thead>
                        <tbody className='divide-line divide-y'>
                           {rows.map((deal) => {
                              const active = deal.id === selected?.id;
                              const { verdict } = checkMandate(
                                 t,
                                 deal,
                                 language,
                              );
                              return (
                                 <tr
                                    key={deal.id}
                                    className={clsx(
                                       'cursor-pointer',
                                       active
                                          ? 'bg-accent-tint'
                                          : 'hover:bg-ground/60',
                                    )}
                                    onClick={() => setSelectedId(deal.id)}
                                 >
                                    <td
                                       className={clsx(
                                          'py-3.5 pr-3 pl-5',
                                          active &&
                                             'shadow-[inset_3px_0_0_var(--color-accent)]',
                                       )}
                                    >
                                       <button
                                          type='button'
                                          aria-pressed={active}
                                          className='text-left text-sm font-semibold'
                                       >
                                          {deal.company}
                                       </button>
                                       <div className='text-ink-soft mt-0.5 text-xs'>
                                          {[
                                             deal.number,
                                             industryText(deal),
                                             [
                                                formatDay(
                                                   dayOf(deal.receivedAt),
                                                ),
                                                // the open application also shows the time
                                                active &&
                                                   timeOf(deal.receivedAt),
                                             ]
                                                .filter(Boolean)
                                                .join(', '),
                                          ].join(' · ')}
                                       </div>
                                    </td>
                                    <td className='text-ink-soft px-3 py-3.5'>
                                       {sourceLine(t, deal)}
                                    </td>
                                    <td className='px-3 py-3.5 text-right font-medium tabular-nums'>
                                       {formatAmount(deal.amount, language)}
                                    </td>
                                    <td className='px-3 py-3.5'>
                                       <Badge tone={mandateTone(verdict.state)}>
                                          {verdict.label}
                                       </Badge>
                                    </td>
                                    <td
                                       className={clsx(
                                          'py-3.5 pr-5 pl-3 whitespace-nowrap',
                                          TRIAGE_CLASSES[triageState(deal)],
                                       )}
                                    >
                                       {triageText(deal)}
                                    </td>
                                 </tr>
                              );
                           })}
                        </tbody>
                     </table>
                  </div>
               ) : (
                  <NoData>{t('Заявок по этим условиям нет')}</NoData>
               )}
               <div className='border-line text-ink-soft mt-auto flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3 text-xs'>
                  <span>
                     {t('Показаны {{shown}} из {{total}}', {
                        shown: rows.length,
                        total: inbox.length,
                     })}
                     {' · '}
                     {t('за {{month}} поступила {{count}} заявка', {
                        month: dayjs(summary.lastMonth.month).format('MMMM'),
                        count: summary.lastMonth.received,
                     })}
                  </span>
                  {rows.length < inbox.length && (
                     <button type='button' className='link' onClick={showAll}>
                        {t('Показать все')}
                     </button>
                  )}
               </div>
            </Card>

            {selected && check && (
               <Card>
                  <div className='border-line border-b px-5 py-4'>
                     <div className='text-ink-soft text-xs'>
                        {[
                           selected.number,
                           sourceFrom(t, selected),
                           formatStamp(selected.receivedAt),
                        ].join(' · ')}
                     </div>
                     <h2 className='mt-1.5 text-xl leading-6 font-bold'>
                        <Link
                           className='hover:underline'
                           to={`/deals/${selected.id}`}
                        >
                           {selected.company}
                        </Link>
                     </h2>
                     <p className='text-ink-soft text-meta mt-1.5'>
                        {selected.about || industryText(selected)}
                     </p>
                  </div>

                  <div className='border-line text-meta border-b px-5 py-4'>
                     <h3 className='text-ink-soft text-xs'>
                        {t('Проверка мандата — автоматически по правилам')}
                     </h3>
                     <ul className='mt-2.5 flex flex-col gap-2'>
                        {check.rows.map((row) => {
                           const { icon: Icon, className } = MARKS[row.state];
                           return (
                              <li
                                 key={row.key}
                                 className='grid grid-cols-[1.25rem_6rem_minmax(0,1fr)] items-start gap-x-2'
                              >
                                 <Icon
                                    aria-hidden
                                    className={clsx('mt-0.5 size-4', className)}
                                    strokeWidth={2.5}
                                 />
                                 <span className='text-ink-soft'>
                                    {row.label}
                                 </span>
                                 <span>{row.value}</span>
                              </li>
                           );
                        })}
                     </ul>
                     <p className='text-ink-soft mt-3 text-xs'>
                        {t(
                           'Правила проверки не оценивают качество проекта — только соответствие опубликованному мандату.',
                        )}
                     </p>
                  </div>

                  {selected.facts && (
                     <div className='border-line text-meta border-b px-5 py-4'>
                        <h3 className='text-ink-soft text-xs'>
                           {t('Из заявки')}
                        </h3>
                        <FactList
                           className='mt-1'
                           labelWidth='6rem'
                           rows={factRows(t, selected.facts)}
                        />
                     </div>
                  )}

                  <div className='px-5 py-4'>
                     <h3 className='text-ink-soft text-xs'>
                        {t('Решение по заявке')}
                     </h3>
                     <div className='text-meta mt-2.5 flex items-center gap-4'>
                        <span className='text-ink-soft w-20'>
                           {t('Владелец')}
                        </span>
                        <FilterSelect
                           accent
                           label={t('Владелец')}
                           options={TEAM.map(({ id, name }) => ({
                              value: id,
                              label: shortName(name),
                           }))}
                           showLabel={false}
                           value={ownerId}
                           onChange={setOwnerId}
                        />
                     </div>
                     <div className='mt-3 flex flex-col gap-2.5'>
                        <Button
                           onClick={() =>
                              deals.takeToScreening(selected.id, ownerId)
                           }
                        >
                           {t('Взять в скрининг')}
                        </Button>
                        <Button
                           variant='ghost'
                           onClick={() => onRequest(selected)}
                        >
                           {t('Запросить данные')}
                        </Button>
                        <Button
                           variant='text'
                           onClick={() => onReject(selected)}
                        >
                           {t('Отказать с причиной')}
                        </Button>
                     </div>
                     <p className='text-ink-soft mt-2 text-xs'>
                        {t(
                           'Отказ требует причину из справочника. Заявитель пока не получает уведомлений — сообщите ему о решении сами.',
                        )}
                     </p>
                  </div>
               </Card>
            )}
         </div>
      </>
   );
};

export default Inbox;
