import { CheckList, RiskList } from '@modules/Deals/components';
import {
   ROUND_STAGE_NAMES,
   SOURCE_LABELS,
   STAGE_LABELS,
} from '@modules/Deals/constants';
import {
   defaultPath,
   dueText,
   formatAmount,
   formatStamp,
   nextTitle,
   pathState,
} from '@modules/Deals/helpers';
import { Avatar, Card, FactList, Progress } from '@shared/components';
import { SECTION_PATHS, TEAM } from '@shared/constants';
import { formatDate, shortName } from '@shared/helpers';
import type { Deal, Fact } from '@shared/types/deals.types';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

interface OverviewProps {
   deal: Deal;
}

// The legal form in front of a company's name does not go into its initials.
const LEGAL_FORM = /^(ООО|АО|ИП|ЧП)\s+/u;

const toRows = (facts: Fact[]) =>
   facts.map(([label, value, note]) => ({ label, value, note }));

// The deal at a glance: where it is on its path, the terms, what DD found,
// and how ready it is for the committee.
const Overview = ({ deal }: OverviewProps) => {
   const { t, i18n } = useTranslation('deals');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const path = deal.path ?? defaultPath(t, deal);
   const team =
      deal.team ??
      (deal.ownerId ? [{ employeeId: deal.ownerId, role: t('Владелец') }] : []);
   const ready = deal.readiness?.items.filter(({ state }) => state === 'done');
   const detailed = !!(deal.terms || deal.metrics || deal.risks);

   return (
      <div className='gap-section flex flex-col'>
         <Card
            action={
               <Link className='link' to='?tab=history'>
                  {t('Журнал переходов')}
               </Link>
            }
            hint={deal.pathHint}
            title={t('Путь сделки')}
         >
            <ol className='grid grid-cols-3 sm:grid-cols-5 xl:grid-cols-9'>
               {path.map((step) => {
                  const state = pathState(deal, step.stage);
                  return (
                     <li
                        key={step.stage}
                        aria-current={state === 'current' ? 'step' : undefined}
                        className={clsx(
                           'border-line min-w-0 border-l px-3 py-3 first:border-l-0',
                           state === 'current' && 'bg-accent-tint',
                        )}
                     >
                        <div className='flex items-center gap-1.5'>
                           <span
                              aria-hidden
                              className={clsx(
                                 'grid size-4 shrink-0 place-items-center rounded-full',
                                 state === 'done' &&
                                    (step.late
                                       ? 'bg-warning-ink text-white'
                                       : 'bg-success-ink text-white'),
                                 state === 'current' &&
                                    'border-accent border-2 after:bg-accent after:size-1.5 after:rounded-full',
                                 state === 'ahead' && 'border-line-strong border',
                              )}
                           >
                              {state === 'done' && (
                                 <Check className='size-3' strokeWidth={3.5} />
                              )}
                           </span>
                           <span
                              className={clsx(
                                 'text-meta font-semibold whitespace-nowrap',
                                 state === 'ahead' && 'text-ink-soft font-normal',
                              )}
                           >
                              {t(STAGE_LABELS[step.stage])}
                           </span>
                        </div>
                        <div className='text-ink-soft mt-1.5 text-xs'>
                           {step.line1}
                        </div>
                        <div
                           className={clsx(
                              'mt-1 text-xs',
                              state === 'current'
                                 ? 'text-accent'
                                 : step.late
                                   ? 'text-warning-ink'
                                   : 'text-ink-soft',
                           )}
                        >
                           {step.line2}
                        </div>
                     </li>
                  );
               })}
            </ol>
         </Card>

         <div className='gap-section grid items-start xl:grid-cols-[minmax(0,1fr)_23.75rem]'>
            <div className='gap-section flex min-w-0 flex-col'>
               {deal.terms && (
                  <Card
                     action={
                        <Link className='link' to={SECTION_PATHS.contracts}>
                           {t('Открыть проект SAFE')}
                        </Link>
                     }
                     title={t('Условия сделки')}
                  >
                     <div className='px-5 pt-1 pb-5'>
                        <FactList
                           divided
                           labelWidth='27%'
                           rows={toRows(deal.terms.rows)}
                        />
                        <p className='bg-warning-tint text-warning-ink text-meta rounded-lg px-4 py-3'>
                           {deal.terms.warning}
                        </p>
                     </div>
                  </Card>
               )}

               {deal.metrics && (
                  <Card hint={deal.metrics.hint} title={t('Метрики, проверенные DD')}>
                     <div className='p-5'>
                        <dl className='grid grid-cols-2 gap-3 xl:grid-cols-4'>
                           {deal.metrics.items.map((item) => (
                              <div
                                 key={item.label}
                                 className='bg-ground rounded-lg px-4 py-3'
                              >
                                 <dt className='text-ink-soft text-xs'>
                                    {item.label}
                                 </dt>
                                 <dd>
                                    <div className='mt-1 text-xl leading-7 font-bold'>
                                       {item.value}
                                    </div>
                                    <div
                                       className={clsx(
                                          'mt-1 text-xs',
                                          item.warn
                                             ? 'text-warning-ink'
                                             : 'text-ink-soft',
                                       )}
                                    >
                                       {item.note}
                                    </div>
                                 </dd>
                              </div>
                           ))}
                        </dl>
                        <p className='text-ink-soft mt-3.5 text-xs'>
                           {deal.metrics.note}
                        </p>
                     </div>
                  </Card>
               )}

               {deal.risks && (
                  <Card
                     action={
                        <Link className='link' to='?tab=dd'>
                           {t('Матрица рисков')}
                        </Link>
                     }
                     hint={t('{{count}} открытый', { count: deal.risks.length })}
                     title={t('Риски из DD')}
                  >
                     <RiskList risks={deal.risks} />
                  </Card>
               )}

               {!detailed && (
                  <Card title={t('Заявка')}>
                     <div className='text-meta px-5 py-3'>
                        <FactList
                           divided
                           labelWidth='27%'
                           rows={[
                              ...(deal.about
                                 ? [{ label: t('Чем занимается'), value: deal.about }]
                                 : []),
                              { label: t('Отрасль'), value: deal.industry },
                              {
                                 label: t('Запрос'),
                                 value: formatAmount(deal.amount, language),
                              },
                              {
                                 label: t('Стадия раунда'),
                                 value: ROUND_STAGE_NAMES[deal.roundStage],
                              },
                              { label: t('География'), value: deal.country },
                              {
                                 label: t('Источник'),
                                 value: t(SOURCE_LABELS[deal.source]),
                              },
                              {
                                 label: t('Поступила'),
                                 value: formatStamp(deal.receivedAt),
                              },
                              ...toRows(deal.facts ?? []),
                           ]}
                        />
                     </div>
                  </Card>
               )}
            </div>

            <div className='gap-section flex min-w-0 flex-col'>
               {deal.readiness && ready && deal.committee && (
                  <Card
                     hint={`${formatDate(deal.committee.date)}, ${deal.committee.time}`}
                     title={t('Готовность к ИК № {{number}}', {
                        number: deal.committee.number,
                     })}
                  >
                     <div className='p-5'>
                        <div className='flex items-center gap-4'>
                           <Progress
                              className='h-1.5 flex-1'
                              max={deal.readiness.items.length}
                              value={ready.length}
                           />
                           <span className='text-meta font-semibold'>
                              {t('{{done}} из {{total}}', {
                                 done: ready.length,
                                 total: deal.readiness.items.length,
                              })}
                           </span>
                        </div>
                        <CheckList
                           className='text-meta mt-4'
                           items={deal.readiness.items}
                        />
                        <p className='text-ink-soft mt-4 text-xs'>
                           {deal.readiness.note}
                        </p>
                     </div>
                  </Card>
               )}

               {deal.next && !deal.readiness && (
                  <Card title={t('Следующий шаг')}>
                     <div className='px-5 py-4'>
                        <div className='font-medium'>{nextTitle(t, deal)}</div>
                        <div className='text-ink-soft text-meta mt-1'>
                           {dueText(t, deal.next)}
                        </div>
                     </div>
                  </Card>
               )}

               {team.length > 0 && (
                  <Card title={t('Команда сделки')}>
                     <ul className='divide-line divide-y px-5 py-1'>
                        {team.map((member) => {
                           const employee = TEAM.find(
                              ({ id }) => id === member.employeeId,
                           );
                           const name = employee
                              ? shortName(employee.name)
                              : (member.name ?? '');
                           return (
                              <li key={name} className='flex gap-3 py-3'>
                                 <Avatar
                                    name={
                                       employee?.name ??
                                       name
                                          .replace(/[^\p{L}\s]/gu, '')
                                          .replace(LEGAL_FORM, '')
                                          .trim()
                                    }
                                 />
                                 <div className='min-w-0'>
                                    <div className='text-meta font-semibold'>
                                       {name}
                                    </div>
                                    <div className='text-ink-soft mt-0.5 text-xs'>
                                       {member.role}
                                    </div>
                                 </div>
                              </li>
                           );
                        })}
                     </ul>
                  </Card>
               )}

               {deal.synergy && (
                  <Card hint={t('заявлено компанией')} title={t('Синергия с SQB')}>
                     <div className='text-meta px-5 py-1'>
                        <FactList
                           divided
                           labelWidth='6.5rem'
                           rows={toRows(deal.synergy)}
                        />
                     </div>
                  </Card>
               )}

               {deal.related && (
                  <Card title={t('Связанные объекты')}>
                     <div className='text-meta px-5 py-1'>
                        <FactList
                           divided
                           labelWidth='6.5rem'
                           rows={toRows(deal.related)}
                        />
                     </div>
                  </Card>
               )}
            </div>
         </div>
      </div>
   );
};

export default Overview;
