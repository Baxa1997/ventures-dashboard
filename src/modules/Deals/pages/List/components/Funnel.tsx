import { ALL, FUNNEL_STAGES, STAGE_LABELS } from '@modules/Deals/constants';
import {
   type Deadline,
   deadlineLabel,
   deadlineTone,
   dealLine,
   dueText,
   formatAmount,
   getDeadline,
   industryText,
   nextTitle,
   sumAmounts,
   stageNorm,
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
import { formatDate, formatDay } from '@shared/helpers';
import type { Deal } from '@shared/types/deals.types';
import type { DealStage } from '@shared/types/work.types';
import clsx from 'clsx';
import { Fragment, useEffect, useMemo, useState } from 'react';
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

interface FunnelProps {
   deals: Deal[];
   onVisible: (rows: Deal[]) => void;
}

type DeadlineFilter = typeof ALL | 'overdue' | 'waiting' | 'on_time';

const TH = 'px-3 py-2.5 text-xs font-normal text-ink-soft';

const deadlineGroup = ({ kind }: Deadline): DeadlineFilter => {
   if (kind === 'overdue' || kind === 'waiting') return kind;
   return 'on_time';
};

const PROGRESS_TONES = {
   accent: 'accent',
   warning: 'warning',
   danger: 'danger',
   success: 'accent',
   neutral: 'accent',
} as const;

// Deals in work, grouped by stage, with the fund's own deadline on each.
const Funnel = ({ deals: all, onVisible }: FunnelProps) => {
   const { t, i18n } = useTranslation('deals');
   const navigate = useNavigate();
   const language = i18n.resolvedLanguage ?? i18n.language;
   const [search, setSearch] = useState('');
   const [ownerId, setOwnerId] = useState<string>(ALL);
   const [source, setSource] = useState<string>(ALL);
   const [industry, setIndustry] = useState<string>(ALL);
   const [deadline, setDeadline] = useState<DeadlineFilter>(ALL);
   const [stage, setStage] = useState<DealStage | typeof ALL>(ALL);

   // inside a stage, the deal that came first is listed first
   const funnel = useMemo(
      () =>
         all
            .filter(({ status }) => status === 'active')
            .sort(
               (a, b) =>
                  a.receivedAt.localeCompare(b.receivedAt) ||
                  a.number.localeCompare(b.number),
            ),
      [all],
   );
   const rows = useMemo(
      () =>
         funnel.filter(
            (deal) =>
               matchesSearch(deal, search) &&
               matches(ownerId, deal.ownerId) &&
               matchesSource(source, deal) &&
               matches(industry, industryText(deal)) &&
               matches(stage, deal.stage) &&
               matches(deadline, deadlineGroup(getDeadline(deal))),
         ),
      [funnel, search, ownerId, source, industry, stage, deadline],
   );

   useEffect(() => onVisible(rows), [rows, onVisible]);

   // the committee meeting that comes first, for the stages that wait for one
   const committee = funnel
      .flatMap((deal) => (deal.committee ? [deal.committee] : []))
      .sort((a, b) => a.date.localeCompare(b.date))[0];

   const tileNote = (key: DealStage, group: Deal[], overdue: number) => {
      if (overdue) return t('{{count}} просрочена', { count: overdue });
      const meeting = group.find((deal) => deal.committee)?.committee;
      if (meeting)
         return t('ИК № {{number}}, {{date}}', {
            number: meeting.number,
            date: formatDay(meeting.date),
         });
      const norm = stageNorm(key);
      if (norm) return t('норма {{days}} р.д.', { days: norm });
      if (key === 'board') return t('по графику НС');
      return committee
         ? t('ближайшее {{date}}', { date: formatDay(committee.date) })
         : t('по графику заседаний');
   };

   const groupNote = (key: DealStage, group: Deal[]) => {
      const norm = stageNorm(key);
      const meeting = group.find((deal) => deal.committee)?.committee;
      return [
         t('{{count}} сделка', { count: group.length }),
         formatAmount(sumAmounts(group), language),
         meeting
            ? t('заседание № {{number}}, {{date}}', {
                 number: meeting.number,
                 date: formatDate(meeting.date),
              })
            : norm
              ? t('норма {{count}} рабочий день', { count: norm })
              : t('по графику заседаний'),
      ].join(' · ');
   };

   return (
      <>
         <FilterBar>
            <SearchField
               label={t('Компания, номер')}
               value={search}
               onChange={setSearch}
            />
            <FilterSelect
               label={t('Владелец')}
               options={[
                  { value: ALL, label: t('Все владельцы') },
                  ...ownerOptions(funnel),
               ]}
               showLabel={false}
               value={ownerId}
               onChange={setOwnerId}
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
               label={t('Отрасль')}
               options={[
                  { value: ALL, label: t('Все отрасли') },
                  ...industryOptions(funnel),
               ]}
               showLabel={false}
               value={industry}
               onChange={setIndustry}
            />
            <FilterSelect
               label={t('Срок')}
               options={[
                  { value: ALL, label: t('все') },
                  { value: 'overdue', label: t('просрочен') },
                  { value: 'waiting', label: t('ждём заявителя') },
                  { value: 'on_time', label: t('в норме') },
               ]}
               value={deadline}
               onChange={setDeadline}
            />
            <span className='ml-auto'>
               <FilterSelect
                  accent
                  label={t('Вид')}
                  options={[{ value: 'table', label: t('таблица') }]}
                  value='table'
                  onChange={() => undefined}
               />
            </span>
         </FilterBar>

         <div className='mt-section gap-section grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8'>
            {FUNNEL_STAGES.map((key) => {
               const group = funnel.filter((deal) => deal.stage === key);
               const overdue = group.filter(
                  (deal) => getDeadline(deal).kind === 'overdue',
               ).length;
               const active = stage === key;
               return (
                  <button
                     key={key}
                     type='button'
                     aria-pressed={active}
                     className={clsx(
                        'rounded-lg border bg-white px-4 py-3 text-left transition-colors',
                        active
                           ? 'border-accent'
                           : overdue
                             ? 'border-danger/50 hover:border-danger'
                             : 'border-line hover:border-line-strong',
                     )}
                     onClick={() => setStage(active ? ALL : key)}
                  >
                     <div className='text-ink-soft truncate text-xs'>
                        {t(STAGE_LABELS[key])}
                     </div>
                     <div className='mt-1 flex items-baseline gap-2'>
                        <span className='text-xl leading-6 font-bold tabular-nums'>
                           {group.length}
                        </span>
                        <span className='text-ink-soft text-xs'>
                           {group.length
                              ? formatAmount(sumAmounts(group), language)
                              : '—'}
                        </span>
                     </div>
                     <div
                        className={clsx(
                           'mt-1 truncate text-xs',
                           overdue ? 'text-danger' : 'text-ink-soft',
                        )}
                     >
                        {tileNote(key, group, overdue)}
                     </div>
                  </button>
               );
            })}
         </div>

         <Card className='mt-section flex-1 overflow-hidden'>
            {rows.length ? (
               <div className='overflow-x-auto'>
                  <table className='text-meta w-full min-w-4xl border-collapse text-left'>
                     <thead>
                        <tr className='border-line border-b'>
                           <th className={`${TH} pl-5`}>{t('Компания')}</th>
                           <th className={`${TH} text-right`}>{t('Запрос')}</th>
                           <th className={TH}>{t('Владелец')}</th>
                           <th className={TH}>{t('На стадии')}</th>
                           <th className={TH}>{t('Следующее действие')}</th>
                           <th className={`${TH} pr-5`}>{t('Срок фонда')}</th>
                        </tr>
                     </thead>
                     <tbody>
                        {FUNNEL_STAGES.map((key) => {
                           const group = rows.filter(
                              (deal) => deal.stage === key,
                           );
                           if (!group.length) return null;
                           return (
                              <Fragment key={key}>
                                 <tr className='bg-ground border-line border-b'>
                                    <th
                                       colSpan={6}
                                       scope='colgroup'
                                       className='px-5 py-2 text-left font-normal'
                                    >
                                       <span className='text-sm font-bold'>
                                          {t(STAGE_LABELS[key])}
                                       </span>
                                       <span className='text-ink-soft ml-3 text-xs'>
                                          {groupNote(key, group)}
                                       </span>
                                    </th>
                                 </tr>
                                 {group.map((deal) => {
                                    const due = getDeadline(deal);
                                    const tone = deadlineTone(due);
                                    return (
                                       <tr
                                          key={deal.id}
                                          className='border-line hover:bg-ground/60 cursor-pointer border-b last:border-b-0'
                                          onClick={() =>
                                             navigate(`/deals/${deal.id}`)
                                          }
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
                                                {dealLine(t, deal)}
                                             </div>
                                          </td>
                                          <td className='px-3 py-3 text-right font-medium tabular-nums'>
                                             {formatAmount(
                                                deal.amount,
                                                language,
                                             )}
                                          </td>
                                          <td className='px-3 py-3'>
                                             <Person id={deal.ownerId} />
                                          </td>
                                          <td className='w-40 px-3 py-3'>
                                             {deal.days && (
                                                <>
                                                   <div
                                                      className={clsx(
                                                         'whitespace-nowrap',
                                                         tone === 'danger' &&
                                                            'text-danger',
                                                      )}
                                                   >
                                                      {t(
                                                         '{{used}} из {{norm}} р.д.',
                                                         deal.days,
                                                      )}
                                                   </div>
                                                   <Progress
                                                      className='mt-1.5 w-32'
                                                      max={deal.days.norm}
                                                      tone={
                                                         PROGRESS_TONES[tone]
                                                      }
                                                      value={deal.days.used}
                                                   />
                                                </>
                                             )}
                                          </td>
                                          <td className='px-3 py-3'>
                                             <div>{nextTitle(t, deal)}</div>
                                             {deal.next && (
                                                <div className='text-ink-soft mt-0.5 text-xs'>
                                                   {dueText(t, deal.next)}
                                                </div>
                                             )}
                                          </td>
                                          <td className='py-3 pr-5 pl-3'>
                                             {due.kind !== 'none' && (
                                                <Badge tone={tone}>
                                                   {deadlineLabel(t, due)}
                                                </Badge>
                                             )}
                                          </td>
                                       </tr>
                                    );
                                 })}
                              </Fragment>
                           );
                        })}
                     </tbody>
                  </table>
               </div>
            ) : (
               <NoData>{t('Сделок по этим условиям нет')}</NoData>
            )}
         </Card>
         <p className='text-ink-soft mt-section text-xs'>
            {t(
               'Срок фонда считается в рабочих днях от входа в стадию. Пока ждём ответа заявителя, часы стоят. Норматив стадий задаётся в Настройках.',
            )}
         </p>
      </>
   );
};

export default Funnel;
