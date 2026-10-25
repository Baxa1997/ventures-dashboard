import DataRequestDialog from '@modules/Portfolio/components/DataRequestDialog';
import DataRequests from '@modules/Portfolio/components/DataRequests';
import FollowOnDialog from '@modules/Portfolio/components/FollowOnDialog';
import QuarterMetricsDialog from '@modules/Portfolio/components/QuarterMetricsDialog';
import ReportDocTitle from '@modules/Portfolio/components/ReportDocTitle';
import {
   CARD_TAB_LABELS,
   CARD_TABS,
   type CardTab,
   INSTRUMENT_LABELS,
   PILOT_STATUSES,
   PORTFOLIO_PATH,
} from '@modules/Portfolio/constants';
import {
   formatMetric,
   metricName,
   quarterLabel,
   quarterName,
   recentQuarters,
   reportDocName,
   reportDocs,
} from '@modules/Portfolio/helpers';
import { type PortfolioData, usePortfolio } from '@modules/Portfolio/hooks';
import portfolio from '@modules/Portfolio/services';
import { useDeals } from '@modules/Deals/hooks';
import {
   Badge,
   Button,
   Card,
   CheckList,
   ConfirmDialog,
   FactList,
   ItemActions,
   Loading,
   NoData,
   PageBody,
   PageHeader,
   STACK,
   Table,
   Tabs,
   TD,
   TH,
} from '@shared/components';
import { formatDate, formatDay, formatUsd, personName } from '@shared/helpers';
import type { PortfolioCompany } from '@shared/types/portfolio.types';
import clsx from 'clsx';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams } from 'react-router';
import { Pilots, Requests } from '../List/components';

const toTab = (value: string | null): CardTab =>
   CARD_TABS.find((tab) => tab === value) ?? 'overview';

// A portfolio company's card. The address keeps the open tab (?tab=metrics).
const CompanyCard = () => {
   const { t } = useTranslation('portfolio');
   const { id } = useParams();
   const data = usePortfolio();
   const company = data?.companies.find((item) => item.id === id);

   if (!data || !company)
      return (
         <>
            <PageHeader
               section={<Link to={PORTFOLIO_PATH}>{t('Портфель')}</Link>}
               title={data ? t('Компания не найдена') : t('Портфель')}
            />
            {data ? (
               <PageBody className='flex flex-col'>
                  <Card className='grid flex-1 place-items-center'>
                     <NoData>
                        <Link className='link' to={PORTFOLIO_PATH}>
                           {t('К списку компаний')}
                        </Link>
                     </NoData>
                  </Card>
               </PageBody>
            ) : (
               <Loading />
            )}
         </>
      );

   return <CompanyView key={company.id} company={company} data={data} />;
};

interface ViewProps {
   data: PortfolioData;
   company: PortfolioCompany;
}

const CompanyView = ({ data, company }: ViewProps) => {
   const { t } = useTranslation('portfolio');
   const [params, setParams] = useSearchParams();
   const tab = toTab(params.get('tab'));
   const [requesting, setRequesting] = useState(false);
   const [followOn, setFollowOn] = useState(false);
   // the quarter whose figures are being entered, or asked to be deleted
   const [editingQuarter, setEditingQuarter] = useState<string | null>(null);
   const [removingQuarter, setRemovingQuarter] = useState<string | null>(null);
   const openRequests = data.requests.filter(
      ({ companyId, status }) =>
         companyId === company.id && status !== 'closed',
   ).length;
   const dataRequests = data.dataRequests.filter(
      ({ companyId }) => companyId === company.id,
   );
   // waiting for the company, or for the fund's check
   const openData = dataRequests.filter(
      ({ status }) => status !== 'accepted',
   ).length;
   const counts: Partial<Record<CardTab, number>> = {
      reports: reportDocs().length,
      data: openData || undefined,
      pilots: company.pilots.length || undefined,
      requests: openRequests || undefined,
   };
   const select = (next: CardTab) =>
      setParams(next === 'overview' ? {} : { tab: next }, { replace: true });

   return (
      <>
         <PageHeader
            actions={
               <>
                  <Button variant='ghost' onClick={() => setRequesting(true)}>
                     {t('Запросить данные')}
                  </Button>
                  <Button onClick={() => setFollowOn(true)}>
                     {t('Открыть follow-on')}
                  </Button>
               </>
            }
            badge={<Badge tone='success'>{t('В портфеле')}</Badge>}
            meta={[
               company.about,
               company.countries,
               t('ответственный {{name}}', {
                  name: personName(company.ownerId),
               }),
            ]
               .filter(Boolean)
               .join(' · ')}
            section={
               <>
                  <Link className='hover:underline' to={PORTFOLIO_PATH}>
                     {t('Портфель')}
                  </Link>
                  {' · '}
                  <Link className='hover:underline' to={PORTFOLIO_PATH}>
                     {t('Компании')}
                  </Link>
               </>
            }
            title={company.name}
         >
            <Tabs
               active={tab}
               items={CARD_TABS.map((key) => ({
                  id: key,
                  label: t(CARD_TAB_LABELS[key]),
                  count: counts[key],
               }))}
               label={company.name}
               onChange={select}
            />
         </PageHeader>
         <PageBody className='flex flex-col'>
            {tab === 'overview' && (
               <Overview company={company} data={data} onSelect={select} />
            )}
            {tab === 'metrics' && (
               <Card
                  action={
                     <button
                        type='button'
                        className='link'
                        onClick={() => setEditingQuarter(data.cycle.quarter)}
                     >
                        {t('Внести показатели')}
                     </button>
                  }
                  className='flex-1'
                  title={t('Показатели по кварталам')}
               >
                  <MetricsTable
                     company={company}
                     cycle={data.cycle}
                     onDelete={setRemovingQuarter}
                     onEdit={setEditingQuarter}
                  />
               </Card>
            )}
            {tab === 'reports' && (
               <ReportsTab company={company} cycle={data.cycle} />
            )}
            {tab === 'data' && (
               <DataRequests
                  company={company}
                  requests={dataRequests}
                  onNew={() => setRequesting(true)}
               />
            )}
            {tab === 'pilots' && <Pilots companyId={company.id} data={data} />}
            {tab === 'requests' && (
               <Requests companyId={company.id} data={data} />
            )}
            {tab === 'documents' && <DocumentsTab company={company} />}
            {tab === 'position' && <PositionTab company={company} />}
         </PageBody>
         <DataRequestDialog
            company={company}
            open={requesting}
            onClose={() => setRequesting(false)}
         />
         <FollowOnDialog
            company={company}
            open={followOn}
            onClose={() => setFollowOn(false)}
         />
         <QuarterMetricsDialog
            company={company}
            initial={editingQuarter ?? undefined}
            open={editingQuarter !== null}
            quarter={data.cycle.quarter}
            onClose={() => setEditingQuarter(null)}
         />
         <ConfirmDialog
            open={removingQuarter !== null}
            subtitle={company.name}
            title={t('Удалить показатели за {{quarter}}?', {
               quarter: removingQuarter ? quarterLabel(t, removingQuarter) : '',
            })}
            onClose={() => setRemovingQuarter(null)}
            onConfirm={() =>
               removingQuarter &&
               portfolio.deleteQuarterMetrics(company.id, removingQuarter)
            }
         >
            <p>
               {t(
                  'Все цифры компании за квартал удалятся; документы отчёта останутся.',
               )}
            </p>
         </ConfirmDialog>
      </>
   );
};

interface OverviewProps extends ViewProps {
   onSelect: (tab: CardTab) => void;
}

const Overview = ({ data, company, onSelect }: OverviewProps) => {
   const { t } = useTranslation('portfolio');
   const { cycle } = data;
   const report = company.reports[cycle.quarter];
   const done = company.pilots.filter(
      ({ status }) => status === 'success',
   ).length;

   return (
      <div className='gap-section grid flex-1 xl:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]'>
         <div className={STACK}>
            <Card
               action={
                  <button
                     type='button'
                     className='link'
                     onClick={() => onSelect('pilots')}
                  >
                     {t('Все пилоты')}
                  </button>
               }
               hint={
                  done ? t('{{count}} завершён', { count: done }) : undefined
               }
               title={t('Пилоты с бизнес-линиями SQB')}
            >
               {company.pilots.length ? (
                  <ul className='divide-line divide-y px-5'>
                     {company.pilots.map((pilot) => (
                        <li
                           key={pilot.id}
                           className='flex items-start justify-between gap-4 py-3.5'
                        >
                           <div>
                              <div className='font-semibold'>{pilot.title}</div>
                              <div className='text-ink-soft mt-0.5 text-xs'>
                                 {t('Заказчик: {{customer}}', {
                                    customer: pilot.customer,
                                 })}
                              </div>
                              <div className='text-ink-soft text-xs'>
                                 {pilot.note}
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
                  <div className='bg-accent-tint mx-5 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-3'>
                     <div>
                        <div className='font-semibold'>
                           {company.commercial.title}
                        </div>
                        <div className='text-ink-soft mt-0.5 text-xs'>
                           {company.commercial.note}
                        </div>
                     </div>
                     <button
                        type='button'
                        className='link'
                        onClick={() => onSelect('requests')}
                     >
                        {t('Открыть задачу')}
                     </button>
                  </div>
               )}
            </Card>
            <Card
               action={
                  <button
                     type='button'
                     className='link'
                     onClick={() => onSelect('metrics')}
                  >
                     {t('Все показатели')}
                  </button>
               }
               hint={t('из отчётов по шаблону фонда')}
               title={t('Показатели по кварталам')}
            >
               <MetricsTable company={company} cycle={cycle} />
               <p className='border-line text-ink-soft border-t px-5 py-3 text-xs'>
                  {t(
                     'Показатели попадают сюда из шаблона отчёта фонда автоматически; аналитик подтверждает, а не перепечатывает.',
                  )}
               </p>
            </Card>
         </div>
         <div className={STACK}>
            <Card title={t('О компании')}>
               {company.facts.length ? (
                  <FactList
                     className='px-5 py-1'
                     divided
                     labelWidth='7rem'
                     rows={company.facts}
                  />
               ) : (
                  <p className='text-ink-soft px-5 py-4'>
                     {t('Сведения о компании ещё не перенесены.')}
                  </p>
               )}
            </Card>
            <Card
               hint={t('до {{date}}', { date: formatDate(cycle.due) })}
               title={t('Отчёт за {{quarter}}', {
                  quarter: quarterName(t, cycle.quarter),
               })}
            >
               <div className='px-5 py-4'>
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
            <Card hint={t('примерные значения')} title={t('Позиция фонда')}>
               <PositionFacts company={company} />
            </Card>
         </div>
      </div>
   );
};

// Figures by quarter; a quarter whose report has not come yet says until when
// the fund waits for it.
interface MetricsTableProps {
   company: PortfolioCompany;
   cycle: PortfolioData['cycle'];
   // given: each quarter's figures are changed or deleted (after asking)
   onEdit?: (quarter: string) => void;
   onDelete?: (quarter: string) => void;
}

const MetricsTable = ({
   company,
   cycle,
   onEdit,
   onDelete,
}: MetricsTableProps) => {
   const { t, i18n } = useTranslation('portfolio');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const quarters = recentQuarters(cycle.quarter);

   if (!company.metrics.length)
      return (
         <p className='text-ink-soft px-5 py-4'>
            {t('Показатели этой компании ещё не перенесены.')}
         </p>
      );

   return (
      <Table
         className='min-w-xl'
         head={
            <>
               <th className={TH}>{t('Показатель')}</th>
               {quarters.map((quarter) => (
                  <th key={quarter} className={clsx(TH, 'text-right')}>
                     {quarterLabel(t, quarter)}
                  </th>
               ))}
            </>
         }
      >
         {company.metrics.map((metric) => {
            const filled = quarters.filter(
               (quarter) => metric.values[quarter] != null,
            );
            const latest = filled.at(-1);
            return (
               <tr key={metric.key}>
                  <td className={clsx(TD, 'text-ink-soft')}>
                     {metricName(t, metric.key)}
                  </td>
                  {quarters.map((quarter) => {
                     const value = metric.values[quarter] ?? null;
                     return (
                        <td
                           key={quarter}
                           className={clsx(
                              TD,
                              'text-right whitespace-nowrap tabular-nums',
                              quarter === latest && 'font-bold',
                              value === null && 'text-ink-soft text-xs',
                           )}
                        >
                           {value !== null
                              ? formatMetric(t, metric, value, language)
                              : quarter === cycle.quarter
                                ? t('ждём до {{date}}', {
                                     date: formatDay(cycle.due),
                                  })
                                : '—'}
                        </td>
                     );
                  })}
               </tr>
            );
         })}
         {onEdit && (
            <tr>
               <td className={clsx(TD, 'py-1')}>
                  <span className='sr-only'>{t('Действия')}</span>
               </td>
               {quarters.map((quarter) => (
                  <td key={quarter} className={clsx(TD, 'py-1')}>
                     <ItemActions
                        icons
                        name={quarterLabel(t, quarter)}
                        onDelete={
                           onDelete &&
                           company.metrics.some(
                              ({ values }) => values[quarter] != null,
                           )
                              ? () => onDelete(quarter)
                              : undefined
                        }
                        onEdit={() => onEdit(quarter)}
                     />
                  </td>
               ))}
            </tr>
         )}
      </Table>
   );
};

const PositionFacts = ({ company }: { company: PortfolioCompany }) => {
   const { t, i18n } = useTranslation('portfolio');
   const language = i18n.resolvedLanguage ?? i18n.language;
   return (
      <FactList
         className='px-5 py-1'
         divided
         labelWidth='7rem'
         rows={[
            {
               label: t('Инструмент'),
               value: t(INSTRUMENT_LABELS[company.instrument]),
            },
            {
               label: t('Вложено'),
               value: `${formatUsd(company.invested, language)} · ${company.since}`,
            },
            { label: t('Оценка'), value: company.position.valuation },
            { label: t('MOIC'), value: company.position.moic },
            { label: t('Ответственный'), value: personName(company.ownerId) },
         ]}
      />
   );
};

// Every quarter's four documents.
const ReportsTab = ({
   company,
   cycle,
}: {
   company: PortfolioCompany;
   cycle: PortfolioData['cycle'];
}) => {
   const { t } = useTranslation('portfolio');
   return (
      <Card className='flex-1'>
         <Table
            className='min-w-2xl'
            head={
               <>
                  <th className={TH}>{t('Квартал')}</th>
                  {reportDocs().map((doc) => (
                     <th key={doc} className={TH}>
                        <ReportDocTitle doc={doc} />
                     </th>
                  ))}
               </>
            }
         >
            {recentQuarters(cycle.quarter)
               .reverse()
               .map((quarter) => (
                  <tr key={quarter}>
                     <td className={clsx(TD, 'font-semibold')}>
                        {quarterLabel(t, quarter)}
                     </td>
                     {reportDocs().map((doc) => {
                        const day = company.reports[quarter]?.received[doc];
                        return (
                           <td key={doc} className={TD}>
                              {day ? (
                                 <>
                                    <Badge tone='success'>{t('Получен')}</Badge>
                                    <div className='text-ink-soft mt-1 text-xs'>
                                       {formatDate(day)}
                                    </div>
                                 </>
                              ) : (
                                 <Badge>{t('Ожидается')}</Badge>
                              )}
                           </td>
                        );
                     })}
                  </tr>
               ))}
         </Table>
      </Card>
   );
};

// The files the company uploaded in its cabinet, newest first.
const DocumentsTab = ({ company }: { company: PortfolioCompany }) => {
   const { t } = useTranslation('portfolio');
   const quarters = Object.keys(company.reports).sort().reverse();
   const files = quarters.flatMap((quarter) =>
      reportDocs().flatMap((doc) => {
         const day = company.reports[quarter]?.received[doc];
         return day ? [{ quarter, doc, day }] : [];
      }),
   );
   return (
      <Card className='flex-1'>
         {files.length ? (
            <Table
               head={
                  <>
                     <th className={TH}>{t('Документ')}</th>
                     <th className={TH}>{t('Квартал')}</th>
                     <th className={TH}>{t('Получен')}</th>
                  </>
               }
            >
               {files.map(({ quarter, doc, day }) => (
                  <tr key={`${quarter}-${doc}`}>
                     <td className={TD}>{reportDocName(t, doc)}</td>
                     <td className={clsx(TD, 'text-ink-soft')}>
                        {quarterLabel(t, quarter)}
                     </td>
                     <td className={clsx(TD, 'text-ink-soft')}>
                        {formatDate(day)}
                     </td>
                  </tr>
               ))}
            </Table>
         ) : (
            <NoData>{t('Компания ещё не загружала документы')}</NoData>
         )}
         <p className='border-line text-ink-soft mt-auto border-t px-5 py-3 text-xs'>
            {t('Файлы хранятся в ucode.')}
         </p>
      </Card>
   );
};

// The fund's position and the deals about the company.
const PositionTab = ({ company }: { company: PortfolioCompany }) => {
   const { t } = useTranslation('portfolio');
   const { deals } = useDeals();
   const related = deals.filter(
      (deal) =>
         deal.id === company.dealId ||
         deal.company
            .toLowerCase()
            .startsWith(`${company.name.toLowerCase()} ·`),
   );
   return (
      <div className='gap-section grid flex-1 lg:grid-cols-2'>
         <Card hint={t('примерные значения')} title={t('Позиция фонда')}>
            <PositionFacts company={company} />
         </Card>
         <Card title={t('Сделки')}>
            {related.length ? (
               <ul className='divide-line divide-y px-5'>
                  {related.map((deal) => (
                     <li
                        key={deal.id}
                        className='flex items-center justify-between gap-3 py-3'
                     >
                        <Link
                           className='font-semibold hover:underline'
                           to={`/deals/${deal.id}`}
                        >
                           {deal.company}
                        </Link>
                        <span className='text-ink-soft text-xs'>
                           {deal.number}
                        </span>
                     </li>
                  ))}
               </ul>
            ) : (
               <NoData>{t('Сделок по компании в реестре нет')}</NoData>
            )}
         </Card>
      </div>
   );
};

export default CompanyCard;
