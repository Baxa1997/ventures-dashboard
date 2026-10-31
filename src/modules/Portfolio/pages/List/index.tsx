import ExitDialog from '@modules/Portfolio/components/ExitDialog';
import RemindDialog from '@modules/Portfolio/components/RemindDialog';
import ValuationDialog from '@modules/Portfolio/components/ValuationDialog';
import {
   LIST_VIEW_LABELS,
   LIST_VIEWS,
   type ListView,
} from '@modules/Portfolio/constants';
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
import type { PortfolioCompany } from '@shared/types/portfolio.types';
import { Columns3, type LucideIcon, Table2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import {
   CompanyBoard,
   CompanyTable,
   MrrChart,
   PortfolioTiles,
} from './components';

const VIEW_ICONS: Record<ListView, LucideIcon> = {
   table: Table2,
   board: Columns3,
};

/* Портфель, as the design draws it: the portfolio's figures, then its
   companies as a table or a board of the active ones and the exits. A
   company joins the portfolio from its deal, when the deal closes; its
   reports, requests for data and pilots are on its card. The address keeps
   the view (?view=board); the views that are gone open the table. */
const PortfolioList = () => {
   const { t } = useTranslation('portfolio');
   const { t: tLayout } = useTranslation('layout');
   const data = usePortfolio();
   const [params, setParams] = useSearchParams();
   const view = LIST_VIEWS.find((one) => one === params.get('view')) ?? 'table';
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

   const { companies } = data;
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

   const actions = (
      <>
         <Button
            hint={t('Открыть печать: список можно сохранить в PDF для НС')}
            variant='ghost'
            onClick={() => window.print()}
         >
            {t('Выгрузить для НС')}
         </Button>
         <Button
            hint={t('Показать, кто не сдал отчёт, и напомнить им')}
            onClick={() => setReminding(true)}
         >
            {t('Запросить отчёты')}
         </Button>
      </>
   );

   return (
      <>
         <PageHeader
            actions={actions}
            meta={t(
               'Портфельные компании фонда. Карточка компании открывается по клику: показатели, пилоты с SQB, задачи и дата рум.',
            )}
            section={tLayout('Инвестиции')}
            title={title}
         />
         <PageBody className='flex flex-col'>
            <PortfolioTiles companies={companies} />
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
               <div className='w-full sm:ml-auto sm:w-72'>
                  <SearchField
                     label={t('Найти компанию')}
                     value={query}
                     onChange={setQuery}
                  />
               </div>
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
