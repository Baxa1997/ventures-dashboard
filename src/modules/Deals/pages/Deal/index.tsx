import { stageName } from '@modules/Settings/services';
import {
   MoveDealDialog,
   type MoveTarget,
   NewDealDialog,
   RejectDialog,
   RequestDialog,
   TransferDialog,
} from '@modules/Deals/components';
import {
   CARD_TAB_LABELS,
   CARD_TABS,
   type CardTab,
   DEALS_PATH,
   RESUBMIT_LABELS,
} from '@modules/Deals/constants';
import {
   columnOf,
   reasonText,
   isClosed,
   isOpen,
   isScored,
   nextStageOf,
   personName,
   scoreRows,
   statusOf,
   tabCounts,
} from '@modules/Deals/helpers';
import { useDeals } from '@modules/Deals/hooks';
import deals from '@modules/Deals/services';
import {
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
import {
   FileText,
   FolderLock,
   Gavel,
   History as HistoryIcon,
   LayoutPanelLeft,
   type LucideIcon,
   ScanSearch,
   ShieldCheck,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams } from 'react-router';
import {
   DealHeader,
   DealStepper,
   Decisions,
   DueDiligence,
   History,
   Memorandum,
   Overview,
   Requests,
   Screening,
} from './components';

const TAB_ICONS: Record<CardTab, LucideIcon> = {
   overview: LayoutPanelLeft,
   screening: ScanSearch,
   requests: FolderLock,
   dd: ShieldCheck,
   memo: FileText,
   decisions: Gavel,
   history: HistoryIcon,
};

const toTab = (value: string | null): CardTab =>
   CARD_TABS.find((tab) => tab === value) ?? 'overview';

/* A deal's card, as the design draws it. The address keeps the open tab
   (?tab=dd). The head's buttons are Обзор's next step; the other tabs carry
   their own buttons, as the design does. The memorandum's tab is not shown
   among the tabs but still opens by its address (?tab=memo). */
const DealCard = () => {
   const { t } = useTranslation('deals');
   const { id } = useParams();
   const user = useCurrentUser();
   const { deals: all, loading } = useDeals();
   const [params, setParams] = useSearchParams();
   const tab = toTab(params.get('tab'));
   const [rejecting, setRejecting] = useState(false);
   const [transferring, setTransferring] = useState(false);
   const [editing, setEditing] = useState(false);
   // «Сменить этап»: closed, or open set to a stage the stepper was clicked on
   const [moving, setMoving] = useState<MoveTarget | null>(null);
   // the open folder of the data room, kept while the card's tabs change;
   // Документы opens one with ?folder=
   const [folderId, setFolderId] = useState(params.get('folder') ?? '');
   // null: the request dialog is closed; otherwise what the request starts with
   const [requestTitle, setRequestTitle] = useState<string | null>(null);
   // the request starts as the fund's DD questionnaire
   const [askingQuestionnaire, setAskingQuestionnaire] = useState(false);
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
   const counts = tabCounts(deal);
   // Сделки filtered to where the deal stands: its stage, or its status
   const column = columnOf(deal);
   const filter = column.startsWith('status:') ? column : `stage:${column}`;
   const listLink = `${DEALS_PATH}?stage=${filter}`;
   const next = nextStageOf(deal.stage);
   const { memo, screening } = deal;

   const crumbs = (
      <>
         <Link className='hover:underline' to={`${DEALS_PATH}?stage=all`}>
            {t('Сделки')}
         </Link>
         {' · '}
         <Link className='hover:underline' to={listLink}>
            {deal.status === 'review' ? stageName('inbox') : status.label}
         </Link>
      </>
   );

   // the memorandum's version, above it
   const memoLine =
      memo &&
      t(
         'Инвестиционный меморандум · версия {{version}} от {{date}} · автор {{author}} · спонсор {{sponsor}}',
         {
            version: memo.version,
            date: formatDate(memo.versionDate),
            author: personName(memo.authorId),
            sponsor: personName(memo.sponsorId),
         },
      );

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
      !!screening.decision &&
      scoreRows(deal).every(({ criterion }) => isScored(criterion));


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
      // as the design has them, the other tabs' buttons are in the tabs
      screening: null,
      requests: null,
      dd: null,
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
         <PageHeader bare section={crumbs} title={deal.company} />
         <PageBody className='flex flex-col pt-5'>
            <DealHeader
               // a closed deal is read only; its memorandum still prints
               actions={(open || tab === 'memo') && actions[tab]}
               deal={deal}
               editable={open}
               onEdit={() => setEditing(true)}
               onMove={() => setMoving({})}
            />
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
                     <Button variant='ghost' onClick={() => setMoving({})}>
                        {t('Вернуть в работу')}
                     </Button>
                  )}
               </div>
            )}
            <DealStepper
               deal={deal}
               onMove={(stage) => setMoving({ stage })}
               onTransfer={() => setTransferring(true)}
            />
            <div className='border-line mb-4.5 border-b'>
               <Tabs
                  active={tab}
                  // the memorandum is not among the design's tabs: it is
                  // kept, and opens from Мой день and the DD's risks
                  items={CARD_TABS.filter(
                     (key) => key !== 'memo' || tab === 'memo',
                  ).map((key) => ({
                     id: key,
                     label: t(CARD_TAB_LABELS[key]),
                     icon: TAB_ICONS[key],
                     count:
                        key === 'requests' || key === 'dd'
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
            </div>
            {tab === 'overview' && (
               <Overview
                  deal={deal}
                  onEdit={() => setEditing(true)}
                  onMove={() => setMoving({})}
                  onTransfer={() => setTransferring(true)}
               />
            )}
            {tab === 'screening' && (
               <Screening
                  key={deal.id}
                  completing={completing.pending}
                  deal={deal}
                  ready={screeningReady}
                  onComplete={completeScreening}
                  onQuestionnaire={() => {
                     setAskingQuestionnaire(true);
                     setRequestTitle(t('DD-вопросник'));
                  }}
                  onRequest={() => setRequestTitle('')}
               />
            )}
            {tab === 'requests' && (
               <Requests
                  deal={deal}
                  folderId={folderId}
                  onFolder={setFolderId}
                  onRequest={setRequestTitle}
               />
            )}
            {tab === 'dd' && <DueDiligence deal={deal} />}
            {tab === 'memo' && memoLine && (
               <p className='text-ink-soft text-meta -mt-1.5 mb-3'>
                  {memoLine}
               </p>
            )}
            {tab === 'memo' && <Memorandum deal={deal} />}
            {tab === 'decisions' && (
               <Decisions
                  deal={deal}
                  onTransfer={() => setTransferring(true)}
               />
            )}
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
            to={moving ?? undefined}
            onClose={() => setMoving(null)}
         />
         <TransferDialog
            deal={transferring ? deal : null}
            onClose={() => setTransferring(false)}
         />
         <RequestDialog
            deal={requestTitle === null ? null : deal}
            folder={folderId}
            questionnaire={askingQuestionnaire}
            title={requestTitle ?? ''}
            onClose={() => {
               setRequestTitle(null);
               setAskingQuestionnaire(false);
            }}
         />
      </>
   );
};

export default DealCard;
