import {
   NewDealDialog,
   RejectDialog,
   RequestDialog,
} from '@modules/Deals/components';
import {
   CLOSED_STATUSES,
   DEFAULT_LIST_TAB,
   LIST_TAB_LABELS,
   LIST_TABS,
   type ListTab,
   SOURCE_LABELS,
   STAGE_NORMS,
} from '@modules/Deals/constants';
import {
   dayOf,
   downloadCsv,
   formatAmount,
   isLate,
   outcomeOf,
   personName,
   statusOf,
   sumAmounts,
} from '@modules/Deals/helpers';
import { useDeals } from '@modules/Deals/hooks';
import {
   Button,
   Loading,
   PageBody,
   PageHeader,
   Tabs,
} from '@shared/components';
import type { Deal } from '@shared/types/deals.types';
import { type ReactNode, useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';
import { Funnel, Inbox, Registry } from './components';

const toTab = (value: string | null): ListTab =>
   LIST_TABS.find((tab) => tab === value) ?? DEFAULT_LIST_TAB;

/* Сделки: incoming applications, the funnel, closed deals and the register.
   The address keeps the tab (?tab=inbox); ?new=1 opens the form for a new deal. */
const DealsList = () => {
   const { t, i18n } = useTranslation('deals');
   const { t: tLayout } = useTranslation('layout');
   const navigate = useNavigate();
   const { deals, summary, loading } = useDeals();
   const [params, setParams] = useSearchParams();
   const tab = toTab(params.get('tab'));
   const [creating, setCreating] = useState(() => params.has('new'));
   const [rejecting, setRejecting] = useState<Deal | null>(null);
   const [requesting, setRequesting] = useState<Deal | null>(null);
   // the rows the open tab shows after its filters, for the Excel export
   const visible = useRef<Deal[]>([]);
   const setVisible = useCallback((rows: Deal[]) => {
      visible.current = rows;
   }, []);
   const language = i18n.resolvedLanguage ?? i18n.language;

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
            ...visible.current.map((deal) => [
               deal.number,
               deal.company,
               deal.industry,
               statusOf(t, deal).label,
               t(SOURCE_LABELS[deal.source]),
               formatAmount(deal.amount, language),
               personName(deal.ownerId || deal.proposedOwnerId),
               dayOf(deal.receivedAt),
               outcomeOf(t, deal).text,
            ]),
      ]);

   if (loading || !summary)
      return (
         <>
            <PageHeader
               section={`${tLayout('Инвестиции')} · ${t('Сделки')}`}
               title={t('Сделки')}
            />
            <Loading />
         </>
      );

   const active = deals.filter(({ status }) => status === 'active');
   const late = active.filter((deal) => isLate(deal)).length;
   const counts: Record<ListTab, number> = {
      inbox: summary.byStatus.review,
      funnel: summary.byStatus.active,
      closed: CLOSED_STATUSES.reduce((sum, key) => sum + summary.byStatus[key], 0),
      all: summary.total,
   };

   const meta: Record<ListTab, string> = {
      inbox: [
         t('{{count}} заявка ждёт разбора', { count: counts.inbox }),
         t('норма — {{count}} рабочий день с момента поступления', {
            count: STAGE_NORMS.inbox ?? 0,
         }),
      ].join(' · '),
      funnel: [
         t('{{count}} сделка в работе', { count: counts.funnel }),
         t('запрошено {{amount}} млн', {
            amount: `$${new Intl.NumberFormat(language, {
               maximumFractionDigits: 1,
            }).format(sumAmounts(active) / 1_000_000)}`,
         }),
         late > 0 && t('у {{count}} сделки нарушен срок фонда', { count: late }),
      ]
         .filter(Boolean)
         .join(' · '),
      closed: t(
         'Отказы, паузы и отозванные заявки — закрытые сделки открываются только на чтение',
      ),
      all: t(
         'Реестр всех заявок и сделок с {{year}} года — от входящей до портфеля, включая отказы и паузы',
         { year: summary.since },
      ),
   };

   const exportButton = (label: string) => (
      <Button variant='ghost' onClick={exportRows}>
         {label}
      </Button>
   );
   const addButton = (
      <Button variant='ghost' onClick={() => setCreating(true)}>
         {t('Добавить вручную')}
      </Button>
   );
   const actions: Record<ListTab, ReactNode> = {
      inbox: addButton,
      funnel: (
         <>
            {exportButton(t('Экспорт в Excel'))}
            <Button onClick={() => setCreating(true)}>{t('Новая сделка')}</Button>
         </>
      ),
      closed: exportButton(t('Выгрузить в Excel')),
      all: (
         <>
            {exportButton(t('Выгрузить в Excel'))}
            {addButton}
         </>
      ),
   };

   return (
      <>
         <PageHeader
            actions={actions[tab]}
            meta={meta[tab]}
            section={`${tLayout('Инвестиции')} · ${t('Сделки')}`}
            title={t('Сделки')}
         >
            <Tabs
               active={tab}
               items={LIST_TABS.map((id) => ({
                  id,
                  label: t(LIST_TAB_LABELS[id]),
                  count: counts[id],
               }))}
               label={t('Сделки')}
               onChange={(next) =>
                  setParams(next === DEFAULT_LIST_TAB ? {} : { tab: next }, {
                     replace: true,
                  })
               }
            />
         </PageHeader>
         <PageBody className='flex flex-col'>
            {tab === 'inbox' && (
               <Inbox
                  deals={deals}
                  summary={summary}
                  onReject={setRejecting}
                  onRequest={setRequesting}
                  onVisible={setVisible}
               />
            )}
            {tab === 'funnel' && <Funnel deals={deals} onVisible={setVisible} />}
            {(tab === 'all' || tab === 'closed') && (
               <Registry
                  key={tab}
                  closedOnly={tab === 'closed'}
                  deals={deals}
                  summary={summary}
                  onVisible={setVisible}
               />
            )}
         </PageBody>
         <NewDealDialog
            open={creating}
            onClose={closeCreating}
            onCreated={(deal) => navigate(`/deals/${deal.id}`)}
         />
         <RejectDialog deal={rejecting} onClose={() => setRejecting(null)} />
         <RequestDialog deal={requesting} onClose={() => setRequesting(null)} />
      </>
   );
};

export default DealsList;
