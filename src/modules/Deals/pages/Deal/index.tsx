import { stageName } from '@modules/Settings/services';
import {
   concludable,
   MoveDealDialog,
   NewDealDialog,
   RejectDialog,
   RequestDialog,
   TransferDialog,
   WorkstreamDialog,
   type WorkstreamMode,
} from '@modules/Deals/components';
import {
   CARD_TAB_LABELS,
   CARD_TABS,
   type CardTab,
   CRITERIA,
   DEALS_PATH,
   LIST_TAB_LABELS,
   type ListTab,
   RESUBMIT_LABELS,
} from '@modules/Deals/constants';
import {
   dayOf,
   industryText,
   reasonText,
   sourceFrom,
   formatAmount,
   headerBadge,
   isClosed,
   isOpen,
   isScored,
   nextStageOf,
   personName,
   statusOf,
   tabCounts,
} from '@modules/Deals/helpers';
import { useDeals } from '@modules/Deals/hooks';
import deals from '@modules/Deals/services';
import {
   Badge,
   Button,
   buttonClass,
   Card,
   Loading,
   NoData,
   PageBody,
   PageHeader,
   Tabs,
} from '@shared/components';
import { formatDate } from '@shared/helpers';
import { useAction, useCurrentUser } from '@shared/hooks';
import type { Deal } from '@shared/types/deals.types';
import { type ReactNode, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams } from 'react-router';
import {
   Decisions,
   DueDiligence,
   History,
   Memorandum,
   Overview,
   Requests,
   Screening,
} from './components';

const toTab = (value: string | null): CardTab =>
   CARD_TABS.find((tab) => tab === value) ?? 'overview';

// The tab of the list a deal is found on.
const listTabOf = (deal: Deal): ListTab => {
   if (deal.status === 'review') return 'inbox';
   if (deal.status === 'active') return 'funnel';
   return isClosed(deal) ? 'closed' : 'all';
};

/* A deal's card. The address keeps the open tab (?tab=dd). The two buttons in
   the header belong to the tab: each tab has its own next step. */
const DealCard = () => {
   const { t, i18n } = useTranslation('deals');
   const { id } = useParams();
   const user = useCurrentUser();
   const { deals: all, loading } = useDeals();
   const [params, setParams] = useSearchParams();
   const tab = toTab(params.get('tab'));
   const [rejecting, setRejecting] = useState(false);
   const [transferring, setTransferring] = useState(false);
   const [editing, setEditing] = useState(false);
   const [moving, setMoving] = useState(false);
   const [uploading, setUploading] = useState(0);
   // the open folder of the data room: the fund's uploads go into it
   const [folderId, setFolderId] = useState('');
   // null: the request dialog is closed; otherwise what the request starts with
   const [requestTitle, setRequestTitle] = useState<string | null>(null);
   const [workstream, setWorkstream] = useState<WorkstreamMode | null>(null);
   const fileInput = useRef<HTMLInputElement>(null);
   const language = i18n.resolvedLanguage ?? i18n.language;
   const deal = all.find((item) => item.id === id);
   const taking = useAction(
      (dealId: string, ownerId: string) =>
         deals.takeToScreening(dealId, ownerId),
      { success: t('Сделка взята в скрининг') },
   );
   const completing = useAction(
      (dealId: string) => deals.completeScreening(dealId, user.id),
      { success: t('Скрининг завершён') },
   );
   const approving = useAction(
      (dealId: string) => deals.approveMemo(dealId, user.id),
      { success: t('Меморандум утверждён') },
   );
   const uploader = useAction(
      async (dealId: string, files: File[], folder: string) => {
         for (const file of files)
            await deals.uploadDocument(dealId, file, user.id, folder);
      },
      {
         kind: 'upload',
         success: (_, files) =>
            files.length > 1
               ? t('Файлы загружены: {{count}}', { count: files.length })
               : t('Файл загружен'),
      },
   );

   if (loading || !deal)
      return (
         <>
            <PageHeader
               section={<Link to={DEALS_PATH}>{t('Сделки')}</Link>}
               title={loading ? t('Сделки') : t('Сделка не найдена')}
            />
            {loading ? (
               <Loading />
            ) : (
               <PageBody className='flex flex-col'>
                  <Card className='grid flex-1 place-items-center'>
                     <NoData>
                        {t('Такой сделки нет — возможно, изменился её адрес.')}{' '}
                        <Link className='link' to={DEALS_PATH}>
                           {t('К списку сделок')}
                        </Link>
                     </NoData>
                  </Card>
               </PageBody>
            )}
         </>
      );

   const open = isOpen(deal);
   const status = statusOf(t, deal);
   const badge = headerBadge(t, deal);
   const counts = tabCounts(deal);
   const listTab = listTabOf(deal);
   const next = nextStageOf(deal.stage);
   const { memo, screening } = deal;

   const crumbs = (
      <>
         <Link className='hover:underline' to={`${DEALS_PATH}?tab=all`}>
            {t('Сделки')}
         </Link>
         {' · '}
         <Link className='hover:underline' to={`${DEALS_PATH}?tab=${listTab}`}>
            {t(LIST_TAB_LABELS[listTab])}
         </Link>
         {deal.status !== 'review' && ` · ${status.label}`}
      </>
   );

   const meta =
      tab === 'memo' && memo
         ? t(
              'Инвестиционный меморандум · версия {{version}} от {{date}} · автор {{author}} · спонсор {{sponsor}}',
              {
                 version: memo.version,
                 date: formatDate(memo.versionDate),
                 author: personName(memo.authorId),
                 sponsor: personName(memo.sponsorId),
              },
           )
         : [
              deal.number,
              deal.meta ??
                 [
                    deal.about || industryText(deal),
                    `${sourceFrom(t, deal)} ${formatDate(dayOf(deal.receivedAt))}`,
                    t('запрос {{amount}}', {
                       amount: formatAmount(deal.amount, language),
                    }),
                 ].join(' · '),
           ].join(' · ');

   const requestButton = (
      <Button variant='ghost' onClick={() => setRequestTitle('')}>
         {t('Запросить данные')}
      </Button>
   );

   const overviewPrimary = () => {
      if (deal.status === 'review')
         return (
            <Button
               loading={taking.pending}
               onClick={() =>
                  taking.run(
                     deal.id,
                     // a website application is offered to nobody: the person taking it owns it
                     deal.ownerId || deal.proposedOwnerId || user.id,
                  )
               }
            >
               {t('Взять в скрининг')}
            </Button>
         );
      return (
         <Button onClick={() => setTransferring(true)}>
            {next
               ? t('Перевести в «{{stage}}»', { stage: stageName(next) })
               : t('Перевести в портфель')}
         </Button>
      );
   };

   // the screening ends as its decision says
   const completeScreening = () => {
      if (screening?.decision === 'request') setRequestTitle('');
      else if (screening?.decision === 'reject') setRejecting(true);
      else completing.run(deal.id);
   };
   const screeningReady =
      deal.stage === 'screening' &&
      !!screening?.secondId &&
      screening.criteria.filter(isScored).length === CRITERIA.length;

   const pending = (deal.workstreams ?? []).some(
      ({ status: state }) => state === 'not_started',
   );

   const actions: Record<CardTab, ReactNode> = {
      overview: (
         <>
            <Button variant='text' onClick={() => setRejecting(true)}>
               {t('Отказать с причиной')}
            </Button>
            {requestButton}
            {overviewPrimary()}
         </>
      ),
      screening: deal.status === 'active' && (
         <>
            {requestButton}
            <Button
               disabled={!screeningReady}
               loading={completing.pending}
               title={
                  screeningReady
                     ? undefined
                     : t('Нужны 7 обоснований и второй оценщик')
               }
               onClick={completeScreening}
            >
               {t('Завершить скрининг')}
            </Button>
         </>
      ),
      requests: (
         <>
            <Button
               loading={uploading > 0}
               variant='ghost'
               onClick={() => fileInput.current?.click()}
            >
               {uploading
                  ? t('Загружается: {{count}}', { count: uploading })
                  : t('Загрузить от имени фонда')}
            </Button>
            <input
               ref={fileInput}
               hidden
               multiple
               type='file'
               onChange={async (event) => {
                  const files = [...(event.target.files ?? [])];
                  event.target.value = '';
                  if (!files.length) return;
                  setUploading(files.length);
                  await uploader.run(
                     deal.id,
                     files,
                     // a folder of another deal, or one deleted, is no folder
                     deal.folders?.some(({ id }) => id === folderId)
                        ? folderId
                        : '',
                  );
                  setUploading(0);
               }}
            />
            <Button onClick={() => setRequestTitle('')}>
               {t('Новый запрос')}
            </Button>
         </>
      ),
      dd: (
         <>
            <Button variant='ghost' onClick={() => setWorkstream('add')}>
               {t('Добавить направление')}
            </Button>
            <Button
               disabled={!pending}
               variant={concludable(deal).length ? 'ghost' : 'primary'}
               onClick={() => setWorkstream('hand')}
            >
               {t('Передать исполнителю')}
            </Button>
            {concludable(deal).length > 0 && (
               <Button onClick={() => setWorkstream('conclude')}>
                  {t('Принять вывод')}
               </Button>
            )}
         </>
      ),
      memo: memo && (
         <>
            <Button variant='ghost' onClick={() => window.print()}>
               {t('Скачать PDF')}
            </Button>
            {memo.approvedAt ? (
               <span
                  className={buttonClass(
                     'ghost',
                     'text-success-ink cursor-default',
                  )}
               >
                  {t('Утверждён спонсором · {{date}}', {
                     date: formatDate(memo.approvedAt),
                  })}
               </span>
            ) : (
               <Button
                  disabled={user.id !== memo.sponsorId}
                  loading={approving.pending}
                  title={
                     user.id === memo.sponsorId
                        ? undefined
                        : t('Утвердить может только спонсор сделки')
                  }
                  onClick={() => approving.run(deal.id)}
               >
                  {t('Утвердить как спонсор')}
               </Button>
            )}
         </>
      ),
      decisions: null,
      history: null,
   };

   return (
      <>
         <PageHeader
            // a closed deal opens for reading only; the memorandum can still be printed
            actions={(open || tab === 'memo') && actions[tab]}
            badge={<Badge tone={badge.tone}>{badge.label}</Badge>}
            meta={meta}
            section={crumbs}
            title={deal.company}
         >
            <Tabs
               active={tab}
               items={CARD_TABS.map((key) => ({
                  id: key,
                  label: t(CARD_TAB_LABELS[key]),
                  count:
                     (key === 'requests' ||
                        key === 'dd' ||
                        key === 'decisions') &&
                     counts[key]
                        ? counts[key]
                        : undefined,
               }))}
               label={deal.company}
               onChange={(key) =>
                  setParams(key === 'overview' ? {} : { tab: key }, {
                     replace: true,
                  })
               }
            />
         </PageHeader>
         <PageBody className='flex flex-col'>
            {(isClosed(deal) || deal.status === 'paused') && deal.closed && (
               <div className='bg-neutral-tint text-meta mb-section flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg px-5 py-3.5'>
                  <span className='min-w-0 flex-1'>
                     <span className='font-semibold'>
                        {status.label}
                        {' · '}
                        {formatDate(deal.closed.date)}
                     </span>
                     {' — '}
                     {[
                        deal.closed.reason && reasonText(deal.closed.reason),
                        deal.closed.note,
                        deal.closed.resubmit &&
                           `${t('Повторная подача')}: ${t(RESUBMIT_LABELS[deal.closed.resubmit]).toLowerCase()}`,
                        deal.status !== 'paused' &&
                           t('карточка открыта только на чтение'),
                     ]
                        .filter(Boolean)
                        .join(' · ')}
                  </span>
                  {deal.status !== 'portfolio' && (
                     <Button variant='ghost' onClick={() => setMoving(true)}>
                        {t('Вернуть в работу')}
                     </Button>
                  )}
               </div>
            )}
            {tab === 'overview' && (
               <Overview
                  deal={deal}
                  onEdit={() => setEditing(true)}
                  onMove={() => setMoving(true)}
                  onTransfer={() => setTransferring(true)}
               />
            )}
            {tab === 'screening' && <Screening key={deal.id} deal={deal} />}
            {tab === 'requests' && (
               <Requests
                  deal={deal}
                  folderId={folderId}
                  onFolder={setFolderId}
                  onRequest={setRequestTitle}
               />
            )}
            {tab === 'dd' && <DueDiligence deal={deal} />}
            {tab === 'memo' && <Memorandum deal={deal} />}
            {tab === 'decisions' && <Decisions deal={deal} />}
            {tab === 'history' && <History deal={deal} />}
         </PageBody>
         <RejectDialog
            deal={rejecting ? deal : null}
            onClose={() => setRejecting(false)}
         />
         <NewDealDialog
            deal={deal}
            open={editing}
            onClose={() => setEditing(false)}
         />
         <MoveDealDialog
            deal={moving ? deal : null}
            onClose={() => setMoving(false)}
         />
         <TransferDialog
            deal={transferring ? deal : null}
            onClose={() => setTransferring(false)}
         />
         <RequestDialog
            deal={requestTitle === null ? null : deal}
            title={requestTitle ?? ''}
            onClose={() => setRequestTitle(null)}
         />
         <WorkstreamDialog
            deal={deal}
            mode={workstream}
            onClose={() => setWorkstream(null)}
         />
      </>
   );
};

export default DealCard;
