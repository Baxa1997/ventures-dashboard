import ExitDialog from '@modules/Portfolio/components/ExitDialog';
import RemindDialog from '@modules/Portfolio/components/RemindDialog';
import ValuationDialog from '@modules/Portfolio/components/ValuationDialog';
import {
   LIST_VIEW_LABELS,
   LIST_VIEWS,
   type ListView,
   OLD_LIST_TABS,
} from '@modules/Portfolio/constants';
import {
   isOverdue,
   quarterLabel,
   reportDocs,
} from '@modules/Portfolio/helpers';
import { usePortfolio } from '@modules/Portfolio/hooks';
import portfolio from '@modules/Portfolio/services';
import { listName } from '@modules/Settings/services';
import {
   Button,
   ConfirmDialog,
   Loading,
   PageBody,
   PageHeader,
   SearchField,
   Segmented,
} from '@shared/components';
import { formatDate } from '@shared/helpers';
import type { PortfolioCompany } from '@shared/types/portfolio.types';
import {
   Columns3,
   FileSpreadsheet,
   FlaskConical,
   type LucideIcon,
   MessagesSquare,
   Table2,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import {
   CompanyBoard,
   CompanyTable,
   MrrChart,
   Pilots,
   PortfolioTiles,
   Reports,
   Requests,
} from './components';

const VIEW_ICONS: Record<ListView, LucideIcon> = {
   table: Table2,
   board: Columns3,
   reports: FileSpreadsheet,
   requests: MessagesSquare,
   pilots: FlaskConical,
};

// The view from the address; the old tabs' names lead to their views.
const toView = (view: string | null, tab: string | null): ListView =>
   LIST_VIEWS.find((one) => one === view) ??
   (tab ? OLD_LIST_TABS[tab] : undefined) ??
   'table';

/* Портфель, as the design draws it: the portfolio's figures, then its
   companies as a table or a board of the active ones and the exits, and the
   quarterly reporting, the companies' requests and their pilots with the
   bank. A company joins the portfolio from its deal, when the deal closes.
   The address keeps the view (?view=board). */
const PortfolioList = () => {
   const { t } = useTranslation('portfolio');
   const { t: tLayout } = useTranslation('layout');
   const data = usePortfolio();
   const [params, setParams] = useSearchParams();
   const view = toView(params.get('view'), params.get('tab'));
   const [query, setQuery] = useState('');
   const [reminding, setReminding] = useState(false);
   const [valuing, setValuing] = useState<PortfolioCompany | null>(null);
   const [exiting, setExiting] = useState<PortfolioCompany | null>(null);
   const [reopening, setReopening] = useState<PortfolioCompany | null>(null);
   const title = t('Портфель');

   if (!data)
      return (
         <>
            <PageHeader section={tLayout('Инвестиции')} title={title} />
            <Loading />
         </>
      );

   const { companies, requests, cycle } = data;
   const open = requests.filter(({ status }) => status !== 'closed');
   const search = query.trim().toLowerCase();
   const found = companies.filter(
      (company) =>
         !search ||
         [
            company.name,
            company.tagline,
            listName('industries', company.industryKey),
         ]
            .join(' ')
            .toLowerCase()
            .includes(search),
   );

   const about = t(
      'Портфельные компании фонда: компания попадает сюда из своей сделки при закрытии. Карточка открывается по клику: показатели, отчётность, пилоты с SQB и задачи.',
   );
   const meta: Record<ListView, string> = {
      table: about,
      board: about,
      reports: [
         quarterLabel(t, cycle.quarter, true),
         t('от каждой компании {{count}} документ', {
            count: reportDocs().length,
         }),
         t('срок сдачи {{date}}', { date: formatDate(cycle.due) }),
      ].join(' · '),
      requests: [
         t('{{count}} открытый запрос', { count: open.length }),
         t('{{count}} ждёт ответа фонда больше 5 дней', {
            count: open.filter(isOverdue).length,
         }),
      ].join(' · '),
      pilots: t('Пилоты портфельных компаний с бизнес-линиями SQB'),
   };

   const remind = (label: string) => (
      <Button onClick={() => setReminding(true)}>{label}</Button>
   );
   const companiesActions = (
      <>
         <Button variant='ghost' onClick={() => window.print()}>
            {t('Выгрузить для НС')}
         </Button>
         {remind(t('Запросить отчёты'))}
      </>
   );
   const actions: Record<ListView, ReactNode> = {
      table: companiesActions,
      board: companiesActions,
      reports: remind(t('Напомнить компаниям')),
      requests: null,
      pilots: null,
   };
   const listed = view === 'table' || view === 'board';

   return (
      <>
         <PageHeader
            actions={actions[view]}
            meta={meta[view]}
            section={tLayout('Инвестиции')}
            title={title}
         />
         <PageBody className='flex flex-col'>
            {listed && <PortfolioTiles companies={companies} />}
            <div className='print-hidden mb-3.5 flex flex-wrap items-center gap-2'>
               <Segmented
                  items={LIST_VIEWS.map((id) => ({
                     id,
                     label: t(LIST_VIEW_LABELS[id]),
                     icon: VIEW_ICONS[id],
                  }))}
                  label={t('Вид')}
                  value={view}
                  onChange={(id) =>
                     setParams(id === 'table' ? {} : { view: id }, {
                        replace: true,
                     })
                  }
               />
               {listed && (
                  <div className='w-full sm:ml-auto sm:w-60'>
                     <SearchField
                        label={t('Найти компанию')}
                        value={query}
                        onChange={setQuery}
                     />
                  </div>
               )}
            </div>
            {view === 'table' && (
               <>
                  <CompanyTable
                     companies={found}
                     data={data}
                     onValuation={setValuing}
                  />
                  <MrrChart companies={companies} />
               </>
            )}
            {view === 'board' && (
               <CompanyBoard
                  companies={found}
                  onExit={setExiting}
                  onReopen={setReopening}
               />
            )}
            {view === 'reports' && <Reports data={data} />}
            {view === 'requests' && <Requests data={data} />}
            {view === 'pilots' && <Pilots data={data} />}
         </PageBody>
         <RemindDialog
            data={data}
            open={reminding}
            onClose={() => setReminding(false)}
         />
         <ValuationDialog company={valuing} onClose={() => setValuing(null)} />
         <ExitDialog
            company={exiting}
            fields={data.exitFields}
            onClose={() => setExiting(null)}
         />
         <ConfirmDialog
            confirmLabel={t('Вернуть')}
            error={t('Не удалось вернуть компанию')}
            open={reopening !== null}
            success={t('Компания снова в активном портфеле')}
            title={t('Вернуть {{name}} в активные?', {
               name: reopening?.name ?? '',
            })}
            onClose={() => setReopening(null)}
            onConfirm={() =>
               reopening && portfolio.reopenCompany(reopening.id)
            }
         >
            <p>
               {t(
                  'Данные о выходе удалятся, компания снова станет активной в портфеле.',
               )}
            </p>
         </ConfirmDialog>
      </>
   );
};

export default PortfolioList;
