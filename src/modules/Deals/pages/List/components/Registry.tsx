import {
   ALL,
   CLOSED_STATUSES,
   REACHED_LABELS,
   REGISTER_FIRST,
   REGISTER_STEP,
   STATUS_FILLS,
   STATUS_LABELS,
   STATUS_ORDER,
} from '@modules/Deals/constants';
import {
   dayOf,
   formatAmount,
   industryText,
   outcomeOf,
   reasonText,
   sourceLine,
   statusOf,
} from '@modules/Deals/helpers';
import {
   Badge,
   Card,
   FilterBar,
   FilterSelect,
   NoData,
   Person,
   Progress,
   SearchField,
} from '@shared/components';
import { formatDayYear } from '@shared/helpers';
import type { Deal, DealsSummary, DealStatus } from '@shared/types/deals.types';
import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import {
   industryOptions,
   matches,
   matchesSearch,
   matchesSource,
   ownerOptions,
   sourceOptions,
} from '../helpers';

interface RegistryProps {
   deals: Deal[];
   summary: DealsSummary;
   closedOnly?: boolean; // the "Отказы и пауза" tab
   onVisible: (rows: Deal[]) => void;
}

const TH = 'px-3 py-2.5 text-xs font-normal text-ink-soft';

// 44%, 1,0%
const percent = (part: number, whole: number, language: string, digits = 0) =>
   `${new Intl.NumberFormat(language, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
   }).format(whole ? (part / whole) * 100 : 0)}%`;

/* The register of every application and deal. Its figures cover the whole
   register; the table lists the deals that are loaded, a page at a time. */
const Registry = ({
   deals: all,
   summary,
   closedOnly = false,
   onVisible,
}: RegistryProps) => {
   const { t, i18n } = useTranslation('deals');
   const navigate = useNavigate();
   const language = i18n.resolvedLanguage ?? i18n.language;
   const [search, setSearch] = useState('');
   const [status, setStatus] = useState<DealStatus | typeof ALL>(ALL);
   const [industry, setIndustry] = useState<string>(ALL);
   const [source, setSource] = useState<string>(ALL);
   const [ownerId, setOwnerId] = useState<string>(ALL);
   const [year, setYear] = useState<string>(ALL);
   const [limit, setLimit] = useState(REGISTER_FIRST);

   const statuses = closedOnly ? CLOSED_STATUSES : STATUS_ORDER;
   const scope = useMemo(
      () =>
         closedOnly
            ? all.filter((deal) => CLOSED_STATUSES.includes(deal.status))
            : all,
      [all, closedOnly],
   );
   const found = useMemo(
      () =>
         scope.filter(
            (deal) =>
               matchesSearch(deal, search) &&
               matches(status, deal.status) &&
               matches(industry, industryText(deal)) &&
               matchesSource(source, deal) &&
               matches(ownerId, deal.ownerId || deal.proposedOwnerId) &&
               matches(year, deal.receivedAt.slice(0, 4)),
         ),
      [scope, search, status, industry, source, ownerId, year],
   );
   const rows = found.slice(0, limit);
   const filtered =
      !!search.trim() ||
      [status, industry, source, ownerId, year].some((value) => value !== ALL);
   // without filters the count is the register's, most of which is not loaded
   const total = filtered
      ? found.length
      : closedOnly
        ? CLOSED_STATUSES.reduce((sum, key) => sum + summary.byStatus[key], 0)
        : summary.total;

   useEffect(() => onVisible(found), [found, onVisible]);

   const years = [...new Set(scope.map((deal) => deal.receivedAt.slice(0, 4)))]
      .sort()
      .reverse();
   const portfolio = summary.byStatus.portfolio;
   const rejected = summary.byStatus.rejected;
   // by count, with "other" kept last
   const reasons = Object.entries(summary.reasons)
      .sort(([, a], [, b]) => b - a)
      .sort(([a], [b]) => Number(a === 'other') - Number(b === 'other'));

   return (
      <>
         {!closedOnly && (
            <div className='mb-section gap-section grid xl:grid-cols-[minmax(0,1fr)_23.75rem]'>
               <Card className='p-5'>
                  <div className='flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1'>
                     <div>
                        <span className='text-display font-bold tabular-nums'>
                           {summary.total}
                        </span>
                        <span className='text-ink-soft ml-3'>
                           {t('сделка с {{year}} года', {
                              count: summary.total,
                              year: summary.since,
                           })}
                        </span>
                     </div>
                     <div className='text-meta font-medium'>
                        {t('В портфель дошли {{reached}} — {{share}}', {
                           reached: portfolio,
                           share: percent(
                              portfolio,
                              summary.total,
                              language,
                              1,
                           ),
                        })}
                     </div>
                  </div>
                  <div
                     role='img'
                     aria-label={STATUS_ORDER.map(
                        (key) =>
                           `${t(STATUS_LABELS[key])}: ${summary.byStatus[key]}`,
                     ).join('; ')}
                     className='animate-fill mt-3 flex h-3.5 gap-0.5 overflow-hidden rounded'
                  >
                     {STATUS_ORDER.map((key) => (
                        <span
                           key={key}
                           className={clsx('min-w-1.5', STATUS_FILLS[key])}
                           style={{ flex: `${summary.byStatus[key]} 0 0` }}
                           title={`${t(STATUS_LABELS[key])}: ${summary.byStatus[key]}`}
                        />
                     ))}
                  </div>
                  <ul className='text-meta mt-3 flex flex-wrap gap-x-6 gap-y-1.5'>
                     {STATUS_ORDER.map((key) => (
                        <li key={key} className='flex items-center gap-2'>
                           <span
                              aria-hidden
                              className={clsx(
                                 'size-2.5 rounded-[3px]',
                                 STATUS_FILLS[key],
                              )}
                           />
                           <span className='text-ink-soft'>
                              {t(STATUS_LABELS[key])}
                           </span>
                           <span className='font-semibold tabular-nums'>
                              {summary.byStatus[key]}
                           </span>
                        </li>
                     ))}
                  </ul>
                  <h2 className='border-line mt-4 border-t pt-4 text-xs font-semibold'>
                     {t(
                        'Сколько сделок дошло до стадии · % — от предыдущей стадии',
                     )}
                  </h2>
                  <dl className='mt-3 grid grid-cols-4 gap-y-4 xl:grid-cols-8'>
                     {summary.reached.map(({ step, count }, index) => (
                        <div
                           key={step}
                           className={clsx(
                              'pr-3',
                              index > 0 && 'border-line border-l pl-4',
                           )}
                        >
                           <dt className='text-ink-soft truncate text-xs'>
                              {t(
                                 REACHED_LABELS[
                                    step as keyof typeof REACHED_LABELS
                                 ],
                              )}
                           </dt>
                           <dd>
                              <div className='text-title mt-1 font-bold tabular-nums'>
                                 {count}
                              </div>
                              <div className='text-ink-soft mt-0.5 text-xs'>
                                 {index
                                    ? percent(
                                         count,
                                         summary.reached[index - 1].count,
                                         language,
                                      )
                                    : t('всего')}
                              </div>
                           </dd>
                        </div>
                     ))}
                  </dl>
                  <p className='text-ink-soft mt-4 text-xs'>
                     {t(
                        'Отказ возможен на любой стадии и только с причиной из справочника. Пауза и отозванные заявки в воронку не входят. Где проседает конверсия — там смотреть причины отказа справа.',
                     )}
                  </p>
               </Card>
               <Card className='p-5'>
                  <h2 className='text-title font-bold'>
                     {t('Причины отказа')}
                     <span className='text-ink-soft text-meta ml-2 font-normal'>
                        {rejected}
                     </span>
                  </h2>
                  <ul className='mt-3 flex flex-col gap-3'>
                     {reasons.map(([reason, count]) => (
                        <li key={reason}>
                           <div className='text-meta flex justify-between gap-3'>
                              <span className='text-ink-soft'>
                                 {reasonText(reason)}
                              </span>
                              <span className='font-semibold tabular-nums'>
                                 {count}
                              </span>
                           </div>
                           <Progress
                              className='mt-1.5'
                              max={Math.max(
                                 ...reasons.map(([, value]) => value),
                              )}
                              tone='neutral'
                              value={count}
                           />
                        </li>
                     ))}
                  </ul>
               </Card>
            </div>
         )}

         <FilterBar>
            <SearchField
               label={t('Компания, номер заявки, основатель')}
               value={search}
               onChange={setSearch}
            />
            <FilterSelect
               label={t('Стадия и итог')}
               options={[
                  { value: ALL, label: t('все') },
                  ...statuses.map((value) => ({
                     value,
                     label: t(STATUS_LABELS[value]).toLowerCase(),
                  })),
               ]}
               value={status}
               onChange={setStatus}
            />
            <FilterSelect
               label={t('Отрасль')}
               options={[
                  { value: ALL, label: t('все') },
                  ...industryOptions(scope),
               ]}
               value={industry}
               onChange={setIndustry}
            />
            <FilterSelect
               label={t('Источник')}
               options={[
                  { value: ALL, label: t('все') },
                  ...sourceOptions(t).map((option) => ({
                     ...option,
                     label: option.label.toLowerCase(),
                  })),
               ]}
               value={source}
               onChange={setSource}
            />
            <FilterSelect
               label={t('Владелец')}
               options={[
                  { value: ALL, label: t('все') },
                  ...ownerOptions(scope),
               ]}
               value={ownerId}
               onChange={setOwnerId}
            />
            <FilterSelect
               label={t('Период')}
               options={[
                  {
                     value: ALL,
                     label: t('с {{year}}', { year: summary.since }),
                  },
                  ...years.map((value) => ({ value, label: value })),
               ]}
               value={year}
               onChange={setYear}
            />
         </FilterBar>

         <Card className='mt-section flex flex-1 flex-col overflow-hidden'>
            {rows.length ? (
               <div className='overflow-x-auto'>
                  <table className='text-meta w-full min-w-5xl border-collapse text-left'>
                     <thead>
                        <tr className='border-line border-b'>
                           <th className={`${TH} pl-5`}>{t('Сделка')}</th>
                           <th className={TH}>{t('Стадия или итог')}</th>
                           <th className={TH}>{t('Источник')}</th>
                           <th className={`${TH} text-right`}>{t('Запрос')}</th>
                           <th className={TH}>{t('Владелец')}</th>
                           <th className={TH}>{t('Поступила')}</th>
                           <th className={`${TH} pr-5`}>
                              {t('Следующий шаг или итог')}
                           </th>
                        </tr>
                     </thead>
                     <tbody className='divide-line divide-y'>
                        {rows.map((deal) => {
                           const state = statusOf(t, deal);
                           const outcome = outcomeOf(t, deal);
                           return (
                              <tr
                                 key={deal.id}
                                 className='hover:bg-ground/60 cursor-pointer'
                                 onClick={() => navigate(`/deals/${deal.id}`)}
                              >
                                 <td className='py-3 pr-3 pl-5'>
                                    <Link
                                       className='text-sm font-semibold hover:underline'
                                       to={`/deals/${deal.id}`}
                                       onClick={(event) =>
                                          event.stopPropagation()
                                       }
                                    >
                                       {deal.company}
                                    </Link>
                                    <div className='text-ink-soft mt-0.5 text-xs'>
                                       {[
                                          deal.number,
                                          industryText(deal),
                                          deal.tags,
                                       ]
                                          .filter(Boolean)
                                          .join(' · ')}
                                    </div>
                                 </td>
                                 <td className='px-3 py-3'>
                                    <Badge tone={state.tone}>
                                       {state.label}
                                    </Badge>
                                 </td>
                                 <td className='text-ink-soft px-3 py-3'>
                                    {sourceLine(t, deal)}
                                 </td>
                                 <td className='px-3 py-3 text-right font-medium tabular-nums'>
                                    {formatAmount(deal.amount, language)}
                                 </td>
                                 <td className='px-3 py-3'>
                                    <Person
                                       id={deal.ownerId || deal.proposedOwnerId}
                                    />
                                 </td>
                                 <td className='text-ink-soft px-3 py-3 whitespace-nowrap'>
                                    {formatDayYear(dayOf(deal.receivedAt))}
                                 </td>
                                 <td
                                    className={clsx(
                                       'w-[24%] py-3 pr-5 pl-3',
                                       outcome.late && 'text-danger',
                                    )}
                                 >
                                    {outcome.text}
                                 </td>
                              </tr>
                           );
                        })}
                     </tbody>
                  </table>
               </div>
            ) : (
               <NoData>{t('Сделок по этим условиям нет')}</NoData>
            )}
            <div className='border-line text-ink-soft mt-auto flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3 text-xs'>
               <span>
                  {t('Показаны {{shown}} из {{total}}', {
                     shown: rows.length,
                     total,
                  })}
                  {' · '}
                  {t('выгрузка в Excel учитывает фильтры')}
               </span>
               {rows.length < found.length && (
                  <button
                     type='button'
                     className='link'
                     onClick={() => setLimit((prev) => prev + REGISTER_STEP)}
                  >
                     {t('Показать ещё {{step}}', { step: REGISTER_STEP })}
                  </button>
               )}
            </div>
         </Card>
         <p className='text-ink-soft mt-section text-xs'>
            {t(
               'Количества и даты на этом экране примерные. Карточка сделки открывается по клику на строку; закрытые сделки открываются только на чтение.',
            )}
         </p>
      </>
   );
};

export default Registry;
