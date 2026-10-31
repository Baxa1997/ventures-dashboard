import CompanyDialog from '@modules/Portfolio/components/CompanyDialog';
import DataRequestDialog from '@modules/Portfolio/components/DataRequestDialog';
import ExitDialog from '@modules/Portfolio/components/ExitDialog';
import FollowOnDialog from '@modules/Portfolio/components/FollowOnDialog';
import QuarterMetricsDialog from '@modules/Portfolio/components/QuarterMetricsDialog';
import ValuationDialog from '@modules/Portfolio/components/ValuationDialog';
import {
   CARD_TAB_LABELS,
   CARD_TABS,
   type CardTab,
   OLD_CARD_TABS,
   PORTFOLIO_PATH,
} from '@modules/Portfolio/constants';
import { quarterLabel } from '@modules/Portfolio/helpers';
import {
   type PortfolioData,
   useCompanyTasks,
   usePortfolio,
} from '@modules/Portfolio/hooks';
import portfolio from '@modules/Portfolio/services';
import { useDeals } from '@modules/Deals/hooks';
import { isDone } from '@modules/Work/helpers';
import {
   Button,
   Card,
   ConfirmDialog,
   Loading,
   NoData,
   PageBody,
   PageHeader,
   Tabs,
} from '@shared/components';
import type { PortfolioCompany } from '@shared/types/portfolio.types';
import {
   FlaskConical,
   FolderLock,
   LayoutPanelLeft,
   ListChecks,
   type LucideIcon,
   TableProperties,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams } from 'react-router';
import CompanyHeader from './components/CompanyHeader';
import DataRoomTab from './components/DataRoomTab';
import Metrics from './components/Metrics';
import Overview from './components/Overview';
import Pilots from './components/Pilots';
import Tasks from './components/Tasks';

const TAB_ICONS: Record<CardTab, LucideIcon> = {
   overview: LayoutPanelLeft,
   metrics: TableProperties,
   pilots: FlaskConical,
   tasks: ListChecks,
   dataroom: FolderLock,
};

// The open tab from the address; the old tabs' names lead to where their
// content went.
const toTab = (value: string | null): CardTab =>
   CARD_TABS.find((tab) => tab === value) ??
   (value ? OLD_CARD_TABS[value] : undefined) ??
   'overview';

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

/* The card, as the design draws it: the company's head, then «Обзор»,
   «Показатели» (with each quarter's report), «Пилоты SQB», «Задачи» and
   «Документы Data Room» (its deal's data room, the fund's requests for data
   and the reports' documents). An active company is asked for data, gets a
   follow-on or is exited; an exited one has its exit changed, or is made
   active again. */
const CompanyView = ({ data, company }: ViewProps) => {
   const { t } = useTranslation('portfolio');
   const [params, setParams] = useSearchParams();
   const tab = toTab(params.get('tab'));
   const { deals } = useDeals();
   const deal = deals.find(({ id }) => id === company.dealId);
   const tasks = useCompanyTasks(company.id);
   const [requesting, setRequesting] = useState(false);
   const [followOn, setFollowOn] = useState(false);
   const [editing, setEditing] = useState(false);
   const [valuing, setValuing] = useState(false);
   const [exiting, setExiting] = useState(false);
   const [reopening, setReopening] = useState(false);
   // the quarter whose figures are being entered, or asked to be deleted
   const [editingQuarter, setEditingQuarter] = useState<string | null>(null);
   const [removingQuarter, setRemovingQuarter] = useState<string | null>(null);
   const active = company.status === 'active';
   const dataRequests = data.dataRequests.filter(
      ({ companyId }) => companyId === company.id,
   );
   const counts: Partial<Record<CardTab, number>> = {
      dataroom: deal?.documents?.length || undefined,
      pilots:
         company.pilots.filter(({ status }) => status === 'in_progress')
            .length || undefined,
      tasks: tasks.filter((task) => !isDone(task)).length || undefined,
   };
   const select = (next: CardTab) =>
      setParams(next === 'overview' ? {} : { tab: next }, { replace: true });

   const actions = active ? (
      <>
         <Button variant='ghost' onClick={() => setRequesting(true)}>
            {t('Запросить данные')}
         </Button>
         <Button variant='ghost' onClick={() => setExiting(true)}>
            {t('Оформить выход')}
         </Button>
         <Button onClick={() => setFollowOn(true)}>
            {t('Открыть follow-on')}
         </Button>
      </>
   ) : (
      <>
         <Button variant='ghost' onClick={() => setExiting(true)}>
            {t('Изменить выход')}
         </Button>
         <Button variant='ghost' onClick={() => setReopening(true)}>
            {t('Вернуть в активные')}
         </Button>
      </>
   );

   return (
      <>
         <PageHeader
            bare
            section={<Link to={PORTFOLIO_PATH}>{t('Портфель')}</Link>}
            title={company.name}
         />
         <PageBody className='flex flex-col pt-5'>
            <CompanyHeader
               actions={actions}
               company={company}
               deal={deal}
               onEdit={() => setEditing(true)}
            />
            <div className='border-line print-hidden mb-4.5 border-b'>
               <Tabs
                  active={tab}
                  items={CARD_TABS.map((key) => ({
                     id: key,
                     label: t(CARD_TAB_LABELS[key]),
                     icon: TAB_ICONS[key],
                     count: counts[key],
                  }))}
                  label={company.name}
                  onChange={select}
               />
            </div>
            {tab === 'overview' && (
               <Overview
                  company={company}
                  data={data}
                  deal={deal}
                  onExit={() => setExiting(true)}
                  onSelect={select}
                  onValuation={() => setValuing(true)}
               />
            )}
            {tab === 'metrics' && (
               <Metrics
                  company={company}
                  cycle={data.cycle}
                  onDelete={setRemovingQuarter}
                  onEdit={setEditingQuarter}
               />
            )}
            {tab === 'pilots' && <Pilots company={company} />}
            {tab === 'tasks' && <Tasks company={company} />}
            {tab === 'dataroom' && (
               <DataRoomTab
                  company={company}
                  cycle={data.cycle}
                  deal={deal}
                  requests={dataRequests}
                  onNewRequest={() => setRequesting(true)}
               />
            )}
         </PageBody>
         <CompanyDialog
            company={editing ? company : null}
            onClose={() => setEditing(false)}
         />
         <ValuationDialog
            company={valuing ? company : null}
            onClose={() => setValuing(false)}
         />
         <ExitDialog
            company={exiting ? company : null}
            fields={data.exitFields}
            onClose={() => setExiting(false)}
         />
         <ConfirmDialog
            confirmLabel={t('Вернуть')}
            error={t('Не удалось вернуть компанию')}
            open={reopening}
            success={t('Компания снова в активном портфеле')}
            title={t('Вернуть {{name}} в активные?', { name: company.name })}
            onClose={() => setReopening(false)}
            onConfirm={() => portfolio.reopenCompany(company.id)}
         >
            <p>
               {t(
                  'Данные о выходе удалятся, компания снова станет активной в портфеле.',
               )}
            </p>
         </ConfirmDialog>
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

export default CompanyCard;
