import { stageName } from '@modules/Settings/services';
import {
   itemBadge,
   materialsOf,
   meetingName,
   speakerOf,
   staleNote,
   waitingDeals,
} from '@modules/Committee/helpers';
import type { CommitteeData } from '@modules/Committee/hooks';
import committee from '@modules/Committee/services';
import { RECOMMENDATION_NAMES } from '@modules/Deals/constants';
import {
   headerBadge,
   industryText,
   proposalText,
   roundText,
   scoreClass,
   scoreOf,
} from '@modules/Deals/helpers';
import {
   Badge,
   Card,
   CompanyMark,
   ConfirmDialog,
   FactList,
   NoData,
   Notice,
   Spinner,
   type FactRow,
} from '@shared/components';
import { ROLE_LABELS, TEAM } from '@shared/constants';
import { personName } from '@shared/helpers';
import { useRequest } from '@shared/hooks';
import type { AgendaItem, Meeting } from '@shared/types/committee.types';
import { X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

interface AgendaProps {
   data: CommitteeData;
   meeting: Meeting;
   editable: boolean; // the secretary or the director
}

/* «Участники (стартапы)», as the design draws them: a card for each question
   with what the members are asked — the sum, the score, who presents it, the
   materials, the sponsor's word. Until the meeting opens a deal waiting for
   it is added from the list above, and a question is taken off by its cross
   until the meeting is held. */
const Agenda = ({ data, meeting, editable }: AgendaProps) => {
   const { t } = useTranslation('committee');
   const adding = useRequest({
      kind: 'create',
      success: t('Добавлено в повестку'),
   });
   const [removing, setRemoving] = useState<AgendaItem | null>(null);
   const waiting = waitingDeals(
      data.meetings,
      data.deals,
      meeting.body,
      meeting.stage,
   );
   const stage =
      meeting.body === 'board'
         ? t('Наблюдательный совет')
         : meeting.stage
           ? stageName(meeting.stage)
           : '';

   return (
      <>
         {meeting.status === 'planned' && editable && (
            <div className='mb-3.5 flex flex-wrap items-center gap-2'>
               <select
                  aria-label={t('Добавить в повестку')}
                  className='field-input select-chevron w-full sm:w-80'
                  disabled={!waiting.length || adding.pending}
                  value=''
                  onChange={(event) => {
                     const dealId = event.target.value;
                     if (dealId)
                        void adding.run(() =>
                           committee.addToAgenda(meeting.id, [dealId]),
                        );
                  }}
               >
                  <option value=''>
                     {waiting.length
                        ? t('Добавить стартап в повестку')
                        : t('Сделок, которые ждут этого заседания, нет')}
                  </option>
                  {waiting.map((deal) => (
                     <option key={deal.id} value={deal.id}>
                        {[deal.company, stageName(deal.stage)].join(' · ')}
                     </option>
                  ))}
               </select>
               {adding.pending && <Spinner className='size-4' />}
               {stage && (
                  <span className='text-ink-faint text-xs'>
                     {t(
                        'Здесь сделки на стадии «{{stage}}», которых нет на другом заседании.',
                        { stage },
                     )}
                  </span>
               )}
            </div>
         )}
         {meeting.agenda.length ? (
            <div className='gap-section stagger grid items-start lg:grid-cols-2 2xl:grid-cols-3'>
               {meeting.agenda.map((item) => (
                  <ItemCard
                     key={item.id}
                     data={data}
                     item={item}
                     meeting={meeting}
                     onRemove={
                        editable && meeting.status !== 'held'
                           ? () => setRemoving(item)
                           : undefined
                     }
                  />
               ))}
            </div>
         ) : (
            <Card className='grid min-h-48 flex-1 place-items-center'>
               <NoData>{t('В повестке нет вопросов.')}</NoData>
            </Card>
         )}
         <ConfirmDialog
            confirmLabel={t('Убрать')}
            error={t('Не удалось убрать из повестки')}
            open={removing !== null}
            subtitle={meetingName(t, meeting)}
            success={t('Убрано из повестки')}
            title={t('Убрать «{{title}}» из повестки?', {
               title: removing?.title ?? '',
            })}
            onClose={() => setRemoving(null)}
            onConfirm={() =>
               removing && committee.removeFromAgenda(meeting.id, removing.id)
            }
         >
            <p>
               {t(
                  'Вопрос уйдёт из повестки вместе с голосами по нему; сделка перестанет ждать это заседание.',
               )}
            </p>
         </ConfirmDialog>
      </>
   );
};

interface ItemCardProps {
   data: CommitteeData;
   meeting: Meeting;
   item: AgendaItem;
   onRemove?: () => void;
}

// One question: the deal, what the members are asked, and where its papers are.
const ItemCard = ({ data, meeting, item, onRemove }: ItemCardProps) => {
   const { t, i18n } = useTranslation('committee');
   const { t: tDeals } = useTranslation('deals');
   const { t: tLayout } = useTranslation('layout');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const deal = data.deals.find(({ id }) => id === item.dealId);
   const stale = staleNote(t, meeting, item, deal);
   const speakerId = speakerOf(item, deal);
   const speakerRole = TEAM.find(({ id }) => id === speakerId)?.role;
   const memo = deal?.memo;
   const memoVersion = item.memoVersion ?? memo?.version;
   const materials =
      item.kind === 'decision' ? materialsOf(item, deal) : null;
   const score = deal ? scoreOf(deal) : null;
   const stage = deal && headerBadge(tDeals, deal);
   const result = itemBadge(t, meeting, item);

   const speaker: FactRow = {
      label: t('Докладчик'),
      value: speakerId
         ? [
              personName(speakerId),
              speakerRole && tLayout(ROLE_LABELS[speakerRole]).toLowerCase(),
           ]
              .filter(Boolean)
              .join(', ')
         : t('не назначен'),
   };
   // what the members are asked: the questions written for the item, or the
   // deal's terms, the sponsor's word and an exception to the mandate
   const rows: FactRow[] = item.facts?.length
      ? [...item.facts, speaker]
      : deal
        ? [
             {
                label: t('Запрос'),
                value: proposalText(tDeals, deal, language),
             },
             {
                label: t('Скоринг'),
                value:
                   score === null ? (
                      '—'
                   ) : (
                      <b className={scoreClass(score)}>
                         {t('{{score}} / 5', { score: score.toFixed(1) })}
                      </b>
                   ),
             },
             speaker,
             {
                label: t('Этап сделки'),
                value: stage && <Badge tone={stage.tone}>{stage.label}</Badge>,
             },
             {
                label: t('Материалы'),
                value: materials && (
                   <Badge
                      tone={
                         materials.ready < materials.total
                            ? 'warning'
                            : 'success'
                      }
                   >
                      {t('{{ready}} из {{total}}', materials)}
                   </Badge>
                ),
             },
             {
                label: t('Рекомендация спонсора'),
                value: memo
                   ? [
                        RECOMMENDATION_NAMES[memo.recommendation],
                        personName(memo.sponsorId),
                     ]
                        .filter(Boolean)
                        .join(' · ')
                   : '',
             },
             {
                label: t('Исключение из мандата'),
                value: deal.terms?.warning ?? '',
             },
          ].filter(({ value }) => value)
        : [speaker];

   return (
      <Card className='flex flex-col'>
         <header className='border-line flex items-center gap-3 border-b px-4.5 py-3'>
            <CompanyMark name={item.title} />
            <div className='min-w-0 flex-1'>
               {deal ? (
                  <Link
                     className='text-meta block truncate font-bold hover:underline'
                     to={`/deals/${deal.id}`}
                  >
                     {item.title}
                  </Link>
               ) : (
                  <div className='text-meta truncate font-bold'>
                     {item.title}
                  </div>
               )}
               <div className='text-ink-soft truncate text-xs'>
                  {deal
                     ? [industryText(deal), roundText(deal)]
                          .filter(Boolean)
                          .join(' · ')
                     : t('Вопрос для информации')}
               </div>
            </div>
            <Badge tone={result.tone}>{result.label}</Badge>
            {onRemove && (
               <button
                  type='button'
                  aria-label={t('Убрать «{{title}}» из повестки', {
                     title: item.title,
                  })}
                  className='text-ink-soft hover:bg-hover hover:text-ink -mr-1.5 grid size-7 shrink-0 place-items-center rounded-md'
                  data-hint={t('Убрать этот вопрос из повестки')}
                  onClick={onRemove}
               >
                  <X aria-hidden className='size-4' />
               </button>
            )}
         </header>
         {stale && (
            <Notice warning className='mx-4.5 mt-3.5'>
               {stale}
            </Notice>
         )}
         <FactList
            className='flex-1 px-4.5 py-2'
            labelWidth='minmax(7rem, 40%)'
            rows={rows}
         />
         {deal && (
            <footer className='border-line text-meta flex flex-wrap gap-x-4 gap-y-1 border-t px-4.5 py-2.5'>
               <Link
                  className='link'
                  data-hint={t('Открыть карточку сделки')}
                  to={`/deals/${deal.id}`}
               >
                  {t('Карточка сделки')}
               </Link>
               {memoVersion && (
                  <Link
                     className='link'
                     data-hint={t('Открыть меморандум этой сделки')}
                     to={`/deals/${deal.id}?tab=memo`}
                  >
                     {t('Меморандум v{{version}}', { version: memoVersion })}
                  </Link>
               )}
               <Link
                  className='link'
                  data-hint={t('Открыть документы этой сделки')}
                  to={`/deals/${deal.id}?tab=requests`}
               >
                  {t('Дата рум')}
               </Link>
            </footer>
         )}
      </Card>
   );
};

export default Agenda;
