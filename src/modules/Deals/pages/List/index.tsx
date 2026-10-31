import {
   MoveDealDialog,
   type MoveStatus,
   type MoveTarget,
   NewDealDialog,
   RejectDialog,
} from '@modules/Deals/components';
import {
   dayOf,
   downloadCsv,
   formatAmount,
   industryText,
   outcomeOf,
   personName,
   sourceLine,
   statusOf,
} from '@modules/Deals/helpers';
import { useDeals } from '@modules/Deals/hooks';
import { Button, Loading, PageBody, PageHeader } from '@shared/components';
import { toast } from '@shared/helpers/toast';
import type { Deal } from '@shared/types/deals.types';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';
import {
   DealBoard,
   type DealFilters,
   DealsToolbar,
   DealTable,
   DealTimeline,
} from './components';
import { DEFAULT_STAGE_FILTER, type StageFilter } from './constants';
import {
   columnOf,
   matchesSearch,
   matchesStage,
   toStageFilter,
   toView,
} from './helpers';

/* Сделки, as the design draws them: the deals as a table, a funnel by stage
   or a timeline of their stages; the stage filter shows the deals in work
   (new applications and the funnel) unless told otherwise. A new
   application is taken, refused or asked for more in its card. The address
   keeps the view and the stage (?view=board&stage=all); ?new=1 opens the
   form for a new deal. */
const DealsList = () => {
   const { t, i18n } = useTranslation('deals');
   const navigate = useNavigate();
   const { deals, loading } = useDeals();
   const [params, setParams] = useSearchParams();
   const view = toView(params.get('view'));
   const stage = toStageFilter(params.get('stage'), params.get('tab'));
   const [filters, setFilters] = useState<DealFilters>({
      industry: '',
      ownerId: '',
      query: '',
   });
   const [creating, setCreating] = useState(() => params.has('new'));
   const [rejecting, setRejecting] = useState<Deal | null>(null);
   const [moving, setMoving] = useState<{
      deal: Deal;
      to: MoveTarget;
   } | null>(null);
   const language = i18n.resolvedLanguage ?? i18n.language;

   // the view and the stage stay in the address; the defaults are left out
   const setParam = (key: 'view' | 'stage', value: string, initial: string) =>
      setParams(
         (prev) => {
            const next = new URLSearchParams(prev);
            next.delete('tab');
            if (value === initial) next.delete(key);
            else next.set(key, value);
            return next;
         },
         { replace: true },
      );

   const closeCreating = () => {
      setCreating(false);
      if (params.has('new'))
         setParams(
            (prev) => {
               const next = new URLSearchParams(prev);
               next.delete('new');
               return next;
            },
            { replace: true },
         );
   };

   // the newest application first
   const shown = useMemo(
      () =>
         deals
            .filter(
               (deal) =>
                  matchesStage(stage, deal) &&
                  (!filters.industry ||
                     deal.industryKey === filters.industry) &&
                  (!filters.ownerId || deal.ownerId === filters.ownerId) &&
                  matchesSearch(deal, filters.query),
            )
            .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)),
      [deals, stage, filters],
   );

   const exportRows = () =>
      downloadCsv('sdelki.csv', [
         [
            t('Номер'),
            t('Компания'),
            t('Отрасль'),
            t('Стадия или итог'),
            t('Источник'),
            t('Запрос'),
            t('Владелец'),
            t('Поступила'),
            t('Следующий шаг или итог'),
         ],
         ...shown.map((deal) => [
            deal.number,
            deal.company,
            industryText(deal),
            statusOf(t, deal).label,
            sourceLine(t, deal),
            formatAmount(deal.amount, language),
            personName(deal.ownerId || deal.proposedOwnerId),
            dayOf(deal.receivedAt),
            outcomeOf(t, deal).text,
         ]),
      ]);

   /* A card dropped on another column of the funnel: a stage or a pause asks
      how to move it there, a refusal for the reason. A new application is
      taken into screening in its card, and a deal reaches the portfolio
      from its card, after closing. */
   const drop = (deal: Deal, column: string) => {
      if (column === 'status:rejected') {
         if (deal.status === 'review' || deal.status === 'active')
            setRejecting(deal);
         else toast.error(t('Эта сделка уже закрыта'));
         return;
      }
      if (column === 'status:portfolio') {
         toast.error(
            t('В портфель сделка переходит из своей карточки — после закрытия'),
         );
         return;
      }
      if (deal.status === 'review') {
         toast.error(t('Новую заявку берут в скрининг в её карточке'));
         navigate(`/deals/${deal.id}`);
         return;
      }
      if (column.startsWith('status:'))
         setMoving({
            deal,
            to: { stage: deal.stage, status: column.slice(7) as MoveStatus },
         });
      else setMoving({ deal, to: { stage: column, status: 'active' } });
   };

   const content = () => {
      if (loading) return <Loading />;
      if (view === 'board')
         return <DealBoard deals={shown} stage={stage} onDrop={drop} />;
      if (view === 'timeline') return <DealTimeline deals={shown} />;
      return <DealTable deals={shown} />;
   };

   return (
      <>
         <PageHeader
            title={t('Сделки')}
            meta={t(
               'Воронка от заявки до решения ИК. Карточка сделки открывается по клику.',
            )}
            actions={
               <>
                  <Button
                     hint={t('Скачать список сделок файлом CSV для Excel')}
                     variant='ghost'
                     onClick={exportRows}
                  >
                     {t('Экспорт в Excel')}
                  </Button>
                  <Button
                     hint={t(
                        'Добавить заявку вручную, если она пришла не через сайт',
                     )}
                     onClick={() => setCreating(true)}
                  >
                     <Plus aria-hidden />
                     {t('Новая сделка')}
                  </Button>
               </>
            }
         />
         <PageBody>
            <DealsToolbar
               deals={deals}
               filters={filters}
               stage={stage}
               view={view}
               onFilter={(patch) =>
                  setFilters((prev) => ({ ...prev, ...patch }))
               }
               onStage={(next: StageFilter) =>
                  setParam('stage', next, DEFAULT_STAGE_FILTER)
               }
               onView={(next) => setParam('view', next, 'table')}
            />
            {content()}
         </PageBody>
         <NewDealDialog
            open={creating}
            onClose={closeCreating}
            onCreated={(deal) => navigate(`/deals/${deal.id}`)}
         />
         <RejectDialog deal={rejecting} onClose={() => setRejecting(null)} />
         <MoveDealDialog
            deal={moving?.deal ?? null}
            to={moving?.to}
            onClose={() => setMoving(null)}
         />
      </>
   );
};

export default DealsList;
