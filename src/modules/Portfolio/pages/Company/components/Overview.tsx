import { investmentContractOf } from '@modules/Contracts/helpers';
import contractsService from '@modules/Contracts/services';
import AnswerDialog from '@modules/Portfolio/components/AnswerDialog';
import {
   CABINET_ROLES,
   EXIT_TYPES,
   INSTRUMENT_LABELS,
   PILOT_STATUSES,
   REQUEST_STATUSES,
   type CardTab,
} from '@modules/Portfolio/constants';
import {
   firstReportNote,
   formatMoic,
   formatStake,
   isOverdue,
   latestValue,
   owesReport,
   positionOf,
   quarterLabel,
   quarterName,
   reportDocName,
   reportDocs,
} from '@modules/Portfolio/helpers';
import { type PortfolioData, useCompanyTasks } from '@modules/Portfolio/hooks';
import { listName } from '@modules/Settings/services';
import { TaskLine } from '@modules/Work/components';
import { isDone, statusAfterTick } from '@modules/Work/helpers';
import work from '@modules/Work/services';
import {
   Avatar,
   Badge,
   Card,
   CheckList,
   FactList,
   NoData,
   StatTile,
} from '@shared/components';
import { COMMITTEE_PATH } from '@modules/Committee/constants';
import { SECTION_PATHS } from '@shared/constants';
import {
   formatDate,
   formatDayYear,
   formatMoneyShort,
   formatUsd,
   personName,
} from '@shared/helpers';
import { useCurrentUser, useServiceData } from '@shared/hooks';
import type { Deal } from '@shared/types/deals.types';
import type {
   CompanyRequest,
   PortfolioCompany,
} from '@shared/types/portfolio.types';
import type { Task } from '@shared/types/work.types';
import { Percent, PieChart, TrendingUp, Wallet } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

interface OverviewProps {
   data: PortfolioData;
   company: PortfolioCompany;
   deal?: Deal; // the deal the company came from
   onSelect: (tab: CardTab) => void;
   onValuation: () => void;
   onExit: () => void;
}

const ROW = 'flex items-start gap-3 px-4.5 py-2.75';

const loadContracts = () => contractsService.getContracts();
const subscribeContracts = (listener: () => void) =>
   contractsService.subscribe(listener);

const linkButton = (label: string, hint: string, onClick: () => void) => (
   <button type='button' className='link' data-hint={hint} onClick={onClick}>
      {label}
   </button>
);

/* A company's «Обзор», as the design draws it: the four figures of the
   fund's position, then what the company is, what it asks the fund for and
   who of it uses the startup cabinet; on the right the investment, an exit,
   the quarter's report, the pilots and the open tasks. */
const Overview = ({
   data,
   company,
   deal,
   onSelect,
   onValuation,
   onExit,
}: OverviewProps) => {
   const { t, i18n } = useTranslation('portfolio');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const user = useCurrentUser();
   const [answering, setAnswering] = useState<CompanyRequest | null>(null);
   const tasks = useCompanyTasks(company.id).filter((task) => !isDone(task));
   const contract = investmentContractOf(
      useServiceData(loadContracts, subscribeContracts) ?? [],
      company.dealId ?? '',
   );
   const position = positionOf(company);
   const active = company.status === 'active';
   const mrr = latestValue(company, 'mrr');
   const first = company.investments[0];
   const { cycle } = data;
   const report = company.reports[cycle.quarter];
   const requests = data.requests
      .filter(({ companyId }) => companyId === company.id)
      .sort(
         (a, b) =>
            Number(a.status === 'closed') - Number(b.status === 'closed') ||
            b.openedAt.localeCompare(a.openedAt),
      );
   const facts = company.facts.length
      ? company.facts
      : (deal?.facts ?? []).map(([label, value]) => ({ label, value }));
   const members = data.members.filter(
      ({ applicationId }) =>
         !!deal?.applicationId && applicationId === deal.applicationId,
   );
   const approvals = (deal?.decisions ?? []).filter(
      ({ verdict }) => verdict === 'approved',
   );
   const usd = (value: number | null) =>
      value === null ? '—' : formatUsd(value, language);

   const tick = (task: Task) =>
      work.updateTask(
         task.id,
         { status: statusAfterTick(task, user.id) },
         user.id,
      );

   const investment: { label: string; value: ReactNode }[] = [
      {
         label: t('Инструмент'),
         value: t(INSTRUMENT_LABELS[company.instrument]),
      },
      {
         label: t('Договор'),
         value: contract ? (
            <Link
               className='link'
               data-hint={t('Открыть договор')}
               to={`${SECTION_PATHS.contracts}?open=${contract.id}`}
            >
               {[
                  contract.number,
                  contract.signedDate && formatDate(contract.signedDate),
               ]
                  .filter(Boolean)
                  .join(' · ')}
            </Link>
         ) : (
            '—'
         ),
      },
      {
         label: t('Вложено'),
         value: formatUsd(company.invested, language),
      },
      ...company.investments.map((item, index) => ({
         label:
            item.kind === 'follow_on'
               ? t('Follow-on')
               : index === 0
                 ? t('Первая инвестиция')
                 : t('Инвестиция'),
         value: [
            formatUsd(item.amount, language),
            formatDayYear(item.date),
            item.stakePct !== null &&
               t('доля {{stake}}', {
                  stake: formatStake(item.stakePct, language),
               }),
            item.valuation !== null &&
               t('оценка {{amount}}', {
                  amount: formatMoneyShort(item.valuation),
               }),
         ]
            .filter(Boolean)
            .join(' · '),
      })),
      {
         label: t('Ответственный'),
         value: personName(company.ownerId) || t('Не назначен'),
      },
      ...approvals.map((decision) => ({
         label: decision.body,
         value: decision.meetingId ? (
            <Link
               className='link'
               data-hint={t('Открыть заседание, где принято это решение')}
               to={`${COMMITTEE_PATH}/${decision.meetingId}`}
            >
               {decision.meetingLabel || decision.outcome}
            </Link>
         ) : (
            decision.meetingLabel || decision.outcome
         ),
      })),
      ...(deal
         ? [
              {
                 label: t('Сделка'),
                 value: (
                    <Link
                       className='link'
                       data-hint={t('Открыть сделку этой компании')}
                       to={`/deals/${deal.id}`}
                    >
                       {deal.number}
                    </Link>
                 ),
              },
           ]
         : []),
      {
         label: t('Оценка компании'),
         value: active ? (
            <button
               type='button'
               className='link'
               data-hint={
                  position.valuation === null
                     ? t('Указать оценку компании')
                     : t('Обновить оценку компании')
               }
               onClick={onValuation}
            >
               {position.valuation === null
                  ? t('Внести оценку')
                  : usd(position.valuation)}
            </button>
         ) : (
            usd(position.valuation)
         ),
      },
   ];

   return (
      <>
         <div className='gap-section stagger mb-4 grid grid-cols-[repeat(auto-fit,minmax(12.5rem,1fr))]'>
            <StatTile
               color='sky'
               icon={Wallet}
               label={t('Вложено')}
               note={[
                  t(INSTRUMENT_LABELS[company.instrument]),
                  first && formatDayYear(first.date),
               ]
                  .filter(Boolean)
                  .join(' · ')}
               value={formatMoneyShort(company.invested)}
            />
            <StatTile
               color='indigo'
               icon={PieChart}
               label={t('Доля фонда')}
               note={
                  active
                     ? position.stake === null
                        ? t('ещё не определена')
                        : t('по вложениям фонда')
                     : t('продана')
               }
               value={
                  position.stake === null
                     ? '—'
                     : formatStake(position.stake, language)
               }
            />
            <StatTile
               color='success'
               icon={TrendingUp}
               label={active ? t('Стоимость доли') : t('Получено при выходе')}
               note={
                  active
                     ? position.valuation === null
                        ? t('оценка не внесена')
                        : t('оценка {{amount}}', {
                             amount: formatMoneyShort(position.valuation),
                          })
                     : company.exit?.date
                       ? formatDayYear(company.exit.date)
                       : ''
               }
               value={
                  position.value === null
                     ? '—'
                     : formatMoneyShort(position.value)
               }
            />
            <StatTile
               color='info'
               icon={Percent}
               label={t('MOIC')}
               note={
                  mrr
                     ? t('MRR {{amount}} · {{quarter}}', {
                          amount: formatMoneyShort(mrr.value),
                          quarter: quarterLabel(t, mrr.quarter),
                       })
                     : t('метрик пока нет')
               }
               tone={
                  position.moic === null
                     ? 'ink'
                     : position.moic >= 1
                       ? 'success'
                       : 'danger'
               }
               value={
                  position.moic === null
                     ? '—'
                     : formatMoic(position.moic, language)
               }
            />
         </div>
         <div className='gap-section grid flex-1 items-start xl:grid-cols-[minmax(0,1fr)_21.25rem]'>
            <div className='gap-section flex min-w-0 flex-col'>
               <Card title={t('О компании')}>
                  {company.about && (
                     <p className='max-w-[72ch] px-4.5 pt-3.5'>
                        {company.about}
                     </p>
                  )}
                  <FactList
                     className='px-4.5 py-2'
                     labelWidth='9rem'
                     rows={[
                        ...facts,
                        {
                           label: t('Отрасль'),
                           value:
                              listName('industries', company.industryKey) ||
                              company.tagline ||
                              '—',
                        },
                        { label: t('Страны'), value: company.countries || '—' },
                        ...(deal?.applicantEmail
                           ? [
                                {
                                   label: t('Контакты'),
                                   value: deal.applicantEmail,
                                },
                             ]
                           : []),
                        {
                           label: t('В портфеле'),
                           value: t('с {{year}}', { year: company.since }),
                        },
                     ]}
                  />
               </Card>
               <Card
                  hint={requests.length || undefined}
                  title={t('Запросы к фонду')}
               >
                  {requests.length ? (
                     <ul className='divide-line divide-y'>
                        {requests.map((request) => {
                           const late = isOverdue(request);
                           const status = REQUEST_STATUSES[request.status];
                           return (
                              <li key={request.id} className={ROW}>
                                 <div className='min-w-0 flex-1'>
                                    <div className='font-semibold'>
                                       {request.title}
                                    </div>
                                    <div className='text-ink-soft text-xs'>
                                       {[
                                          formatDate(request.openedAt),
                                          personName(request.ownerId) ||
                                             t('Не назначен'),
                                       ].join(' · ')}
                                    </div>
                                    {(request.answer || request.note) && (
                                       <div className='text-ink-soft mt-0.5 text-xs'>
                                          {request.answer || request.note}
                                       </div>
                                    )}
                                 </div>
                                 <div className='flex shrink-0 flex-col items-end gap-1.5'>
                                    <Badge tone={late ? 'danger' : status.tone}>
                                       {t(status.label)}
                                    </Badge>
                                    {request.status !== 'closed' &&
                                       linkButton(
                                          t('Ответить'),
                                          t('Записать ответ на этот запрос'),
                                          () => setAnswering(request),
                                       )}
                                 </div>
                              </li>
                           );
                        })}
                     </ul>
                  ) : (
                     <NoData>
                        {t(
                           'Запросов от компании нет. Основатель отправляет их из кабинета.',
                        )}
                     </NoData>
                  )}
               </Card>
               <Card
                  hint={
                     (deal?.applicantEmail ? 1 : 0) + members.length ||
                     undefined
                  }
                  title={t('Команда в кабинете основателя')}
               >
                  {deal?.applicantEmail ? (
                     <ul className='divide-line divide-y'>
                        <li className={ROW}>
                           <Avatar
                              name={deal.applicantName || deal.applicantEmail}
                              size='md'
                           />
                           <div className='min-w-0 flex-1'>
                              <div className='font-semibold'>
                                 {deal.applicantName || deal.applicantEmail}
                              </div>
                              <div className='text-ink-soft text-xs'>
                                 {deal.applicantEmail}
                              </div>
                           </div>
                           <Badge tone='accent'>{t('Заявитель')}</Badge>
                        </li>
                        {members.map((member) => (
                           <li key={member.id} className={ROW}>
                              <Avatar
                                 name={member.name || member.email}
                                 size='md'
                              />
                              <div className='min-w-0 flex-1'>
                                 <div className='font-semibold'>
                                    {member.name || member.email}
                                 </div>
                                 <div className='text-ink-soft text-xs'>
                                    {[
                                       member.email,
                                       !member.active && t('доступ закрыт'),
                                    ]
                                       .filter(Boolean)
                                       .join(' · ')}
                                 </div>
                              </div>
                              <Badge
                                 tone={member.active ? 'accent' : 'neutral'}
                              >
                                 {t(CABINET_ROLES[member.role])}
                              </Badge>
                           </li>
                        ))}
                     </ul>
                  ) : (
                     <NoData>
                        {t(
                           'Компания пришла не через сайт: кабинета основателя у неё нет.',
                        )}
                     </NoData>
                  )}
                  {deal?.applicantEmail && (
                     <p className='text-ink-soft border-line border-t px-4.5 py-2.5 text-xs'>
                        {t(
                           'Заявитель входит в кабинет по коду на свой email и сам добавляет команду.',
                        )}
                     </p>
                  )}
               </Card>
            </div>
            <div className='gap-section flex min-w-0 flex-col'>
               <Card title={t('Инвестиция')}>
                  <FactList
                     className='px-4.5 py-2'
                     labelWidth='8rem'
                     rows={investment}
                  />
               </Card>
               {!active && (
                  <Card
                     action={linkButton(
                        t('Изменить'),
                        t('Изменить данные о выходе'),
                        onExit,
                     )}
                     title={t('Выход')}
                  >
                     <FactList
                        className='px-4.5 py-2'
                        labelWidth='8rem'
                        rows={[
                           {
                              label: t('Итог'),
                              value:
                                 company.status === 'written_off'
                                    ? t('Списание')
                                    : company.exit?.type
                                      ? t(EXIT_TYPES[company.exit.type])
                                      : t('Продажа доли'),
                           },
                           {
                              label: t('Дата'),
                              value: formatDayYear(company.exit?.date ?? ''),
                           },
                           { label: t('Получено'), value: usd(position.value) },
                           {
                              label: t('Покупатель'),
                              value: company.exit?.buyer || '—',
                           },
                           {
                              label: t('MOIC'),
                              value:
                                 position.moic === null
                                    ? '—'
                                    : formatMoic(position.moic, language),
                           },
                        ]}
                     />
                  </Card>
               )}
               {!owesReport(company, cycle.quarter) ? (
                  <Card title={t('Отчётность')}>
                     <p className='text-ink-soft text-meta px-4.5 py-3.5'>
                        {firstReportNote(t, company)}
                     </p>
                  </Card>
               ) : (
                  <Card
                     hint={t('до {{date}}', { date: formatDate(cycle.due) })}
                     title={t('Отчёт за {{quarter}}', {
                        quarter: quarterName(t, cycle.quarter),
                     })}
                  >
                     <div className='px-4.5 py-3.5'>
                        <CheckList
                           items={reportDocs().map((doc) => ({
                              id: doc,
                              text: reportDocName(t, doc),
                              note: report?.received[doc]
                                 ? t('получен {{date}}', {
                                      date: formatDate(
                                         report.received[doc] as string,
                                      ),
                                   })
                                 : '',
                              state: report?.received[doc] ? 'done' : 'open',
                           }))}
                        />
                        {cycle.requestedAt && (
                           <p className='text-ink-soft mt-3 text-xs'>
                              {t(
                                 'Отчёт запрошен {{date}}. Напомните компании {{auto}} сами — автоматических писем пока нет.',
                                 {
                                    date: formatDate(cycle.requestedAt),
                                    auto: formatDate(cycle.autoReminderAt),
                                 },
                              )}
                           </p>
                        )}
                     </div>
                  </Card>
               )}
               <Card
                  action={linkButton(
                     t('Все'),
                     t('Перейти на вкладку пилотов'),
                     () => onSelect('pilots'),
                  )}
                  title={t('Пилоты SQB')}
               >
                  {company.pilots.length ? (
                     <ul className='divide-line divide-y'>
                        {company.pilots.map((pilot) => (
                           <li key={pilot.id} className={ROW}>
                              <div className='min-w-0 flex-1'>
                                 <div className='font-semibold'>
                                    {pilot.title}
                                 </div>
                                 <div className='text-ink-soft text-xs'>
                                    {[
                                       pilot.customer,
                                       pilot.endedAt &&
                                          t('до {{date}}', {
                                             date: formatDate(pilot.endedAt),
                                          }),
                                    ]
                                       .filter(Boolean)
                                       .join(' · ')}
                                 </div>
                              </div>
                              <Badge tone={PILOT_STATUSES[pilot.status].tone}>
                                 {t(PILOT_STATUSES[pilot.status].label)}
                              </Badge>
                           </li>
                        ))}
                     </ul>
                  ) : (
                     <NoData>{t('Пилотов с банком пока нет')}</NoData>
                  )}
                  {company.commercial && (
                     <div className='bg-accent-tint mx-4.5 mb-3.5 rounded-lg px-3.5 py-2.5'>
                        <div className='font-semibold'>
                           {company.commercial.title}
                        </div>
                        <div className='text-ink-soft mt-0.5 text-xs'>
                           {company.commercial.note}
                        </div>
                     </div>
                  )}
               </Card>
               <Card
                  action={linkButton(
                     t('Все'),
                     t('Перейти на вкладку задач'),
                     () => onSelect('tasks'),
                  )}
                  hint={tasks.length || undefined}
                  title={t('Открытые задачи')}
               >
                  {tasks.length ? (
                     <ul>
                        {tasks.slice(0, 5).map((task) => (
                           <TaskLine
                              key={task.id}
                              target=''
                              task={task}
                              onTick={tick}
                           />
                        ))}
                     </ul>
                  ) : (
                     <NoData>{t('Открытых задач нет.')}</NoData>
                  )}
               </Card>
            </div>
         </div>
         <AnswerDialog request={answering} onClose={() => setAnswering(null)} />
      </>
   );
};

export default Overview;
