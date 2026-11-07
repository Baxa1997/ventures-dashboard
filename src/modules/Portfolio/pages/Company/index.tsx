import CompanyDialog from '@modules/Portfolio/components/CompanyDialog';
import DataRequestDialog from '@modules/Portfolio/components/DataRequestDialog';
import ExitDialog from '@modules/Portfolio/components/ExitDialog';
import FollowOnDialog from '@modules/Portfolio/components/FollowOnDialog';
import ValuationDialog from '@modules/Portfolio/components/ValuationDialog';
import {
   CARD_TAB_LABELS,
   CARD_TABS,
   type CardTab,
   OLD_CARD_TABS,
   PORTFOLIO_PATH,
} from '@modules/Portfolio/constants';
import {
   type PortfolioData,
   useCompanyTasks,
   usePortfolio,
} from '@modules/Portfolio/hooks';
import portfolio from '@modules/Portfolio/services';
import { useDeals } from '@modules/Deals/hooks';
import dealsService from '@modules/Deals/services';
import { useRights } from '@modules/Settings/hooks/rights';
import work from '@modules/Work/services';
import { useCurrentUser } from '@shared/hooks';
import { isDone } from '@modules/Work/helpers';
import {
   Card,
   ConfirmDialog,
   Loading,
   type MenuAction,
   NoData,
   PageBody,
   PageHeader,
   Tabs,
} from '@shared/components';
import type { PortfolioCompany } from '@shared/types/portfolio.types';
import {
   FileQuestion,
   FlaskConical,
   FolderLock,
   Handshake,
   LayoutPanelLeft,
   ListChecks,
   LogOut,
   type LucideIcon,
   RotateCcw,
   Repeat,
   TableProperties,
   Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CHAT_PATH } from '@shared/constants';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
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
                        <Link
                           className='link'
                           data-hint={t('Вернуться к списку компаний')}
                           to={PORTFOLIO_PATH}
                        >
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
   const navigate = useNavigate();
   const user = useCurrentUser();
   const rights = useRights();
   const [removing, setRemoving] = useState(false);
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

   const toDeal: MenuAction[] = company.dealId
      ? [
           {
              label: t('Открыть сделку'),
              icon: Handshake,
              hint: t('Открыть сделку этой компании'),
              onSelect: () => navigate(`/deals/${company.dealId}`),
           },
        ]
      : [];

   /* The company's steps under the head's «⋯», as the deal's: the main one
      in the accent colour (a follow-on, or making an exited company active
      again), then asking for data and the deal it came from, and the exit
      last. */
   // a company added by mistake leaves the portfolio, its deal back on its closing
   const remove: MenuAction[] =
      rights('portfolio') === 'full'
         ? [
              {
                 label: t('Удалить из портфеля'),
                 icon: Trash2,
                 danger: true,
                 hint: t(
                    'Удалить компанию, добавленную по ошибке: её сделка вернётся на этап «Закрытие»',
                 ),
                 onSelect: () => setRemoving(true),
              },
           ]
         : [];
   const menu: MenuAction[] = [
      ...(active
      ? [
           {
              label: t('Открыть follow-on'),
              icon: Repeat,
              accent: true,
              hint: t('Открыть новую сделку follow-on по этой компании'),
              onSelect: () => setFollowOn(true),
           },
           {
              label: t('Запросить данные'),
              icon: FileQuestion,
              hint: t(
                 'Попросить у компании данные: запрос появится в её кабинете',
              ),
              onSelect: () => setRequesting(true),
           },
           ...toDeal,
           {
              label: t('Оформить выход'),
              icon: LogOut,
              hint: t('Записать продажу доли или списание компании'),
              onSelect: () => setExiting(true),
           },
        ]
      : [
           {
              label: t('Вернуть в активные'),
              icon: RotateCcw,
              accent: true,
              hint: t('Снять выход и вернуть компанию в активные'),
              onSelect: () => setReopening(true),
           },
           {
              label: t('Изменить выход'),
              icon: LogOut,
              hint: t('Изменить данные о выходе'),
              onSelect: () => setExiting(true),
           },
           ...toDeal,
        ]),
      ...remove,
   ];

   return (
      <>
         <PageHeader
            bare
            section={<Link to={PORTFOLIO_PATH}>{t('Портфель')}</Link>}
            title={company.name}
         />
         <PageBody className='flex flex-col pt-5'>
            <CompanyHeader
               company={company}
               deal={deal}
               menu={menu}
               onChat={deal && (() => navigate(`${CHAT_PATH}?chat=${deal.id}`))}
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
               <Metrics company={company} cycle={data.cycle} />
            )}
            {tab === 'pilots' && (
               <Pilots company={company} fields={data.pilotFields} />
            )}
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
         <ConfirmDialog
            open={removing}
            success={t('Компания удалена из портфеля')}
            title={t('Удалить {{name}} из портфеля?', { name: company.name })}
            onClose={() => setRemoving(false)}
            onConfirm={async () => {
               const dealId = await portfolio.removeCompany(company.id);
               if (dealId && deal?.status === 'portfolio')
                  await dealsService.moveDeal(
                     dealId,
                     { stage: 'closing', status: 'active' },
                     t('Компания удалена из портфеля'),
                     user.id,
                  );
               await work.reloadTasks();
               navigate(PORTFOLIO_PATH, { replace: true });
            }}
         >
            <p>
               {t(
                  'Уйдут платежи, квартальные отчёты и показатели, пилоты, запросы, документы и задачи компании. Это нельзя отменить.',
               )}
            </p>
            {deal && (
               <p className='mt-2'>
                  {t(
                     'Сделка {{number}} вернётся на этап «Закрытие» — так отменяется «Перевести в портфель». Карточка компании на сайте остаётся: её скрывают в «Сайт → Портфель».',
                     { number: deal.number },
                  )}
               </p>
            )}
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
      </>
   );
};

export default CompanyCard;
