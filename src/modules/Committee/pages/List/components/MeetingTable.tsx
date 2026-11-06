import MeetingDialog from '@modules/Committee/components/MeetingDialog';
import {
   COMMITTEE_PATH,
   MEETING_STATUS,
   OUTCOMES,
   PROTOCOL_STATES,
} from '@modules/Committee/constants';
import {
   itemBadge,
   materialsOf,
   meetingName,
   meetingType,
   participantsOf,
   speakerOf,
   tallyVotes,
   waitingDeals,
} from '@modules/Committee/helpers';
import type { CommitteeData } from '@modules/Committee/hooks';
import committee from '@modules/Committee/services';
import {
   headerBadge,
   industryText,
   roundText,
   scoreClass,
   scoreOf,
} from '@modules/Deals/helpers';
import { stageName } from '@modules/Settings/services';
import { relativeDay } from '@modules/Work/helpers';
import {
   Badge,
   Button,
   Card,
   CompanyMark,
   ConfirmDialog,
   ItemActions,
   NoData,
   Spinner,
   Table,
   TD,
   TH,
} from '@shared/components';
import { TEAM } from '@shared/constants';
import {
   formatDayYear,
   formatUsd,
   parseAmount,
   personName,
} from '@shared/helpers';
import { useAction, useCurrentUser, useRequest } from '@shared/hooks';
import type {
   AgendaItem,
   ItemOutcome,
   Meeting,
} from '@shared/types/committee.types';
import type { Deal } from '@shared/types/deals.types';
import clsx from 'clsx';
import { ArrowUpRight, Check, ChevronRight, X } from 'lucide-react';
import { Fragment, type KeyboardEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';

interface MeetingTableProps {
   data: CommitteeData;
}

/* «Таблица»: the register of the meetings, newest first, as the design draws
   it. A row opens in place to show its questions — the deal, its stage, the
   sum asked, the score, who presents it, the votes, the decision and the
   materials — where they are changed, added and taken off, and leads to the
   meeting. */
const MeetingTable = ({ data }: MeetingTableProps) => {
   const { t } = useTranslation('committee');
   const { t: tWork } = useTranslation('work');
   const [open, setOpen] = useState<string[]>([]);
   const meetings = [...data.meetings].sort((a, b) =>
      b.date.localeCompare(a.date),
   );

   const toggle = (id: string) =>
      setOpen((ids) =>
         ids.includes(id) ? ids.filter((one) => one !== id) : [...ids, id],
      );

   if (!meetings.length)
      return (
         <Card className='grid flex-1 place-items-center'>
            <NoData>{t('Заседаний пока нет')}</NoData>
         </Card>
      );

   return (
      <Card>
         <Table
            className='min-w-5xl'
            head={
               <>
                  <th aria-label={t('Раскрыть')} className={clsx(TH, 'w-10')} />
                  <th className={TH}>{t('Заседание')}</th>
                  <th className={TH}>{t('Дата')}</th>
                  <th className={TH}>{t('Статус')}</th>
                  <th className={TH}>{t('Вопросы повестки')}</th>
                  <th className={TH}>{t('Итоги')}</th>
                  <th className={clsx(TH, 'text-right')}>{t('Члены ИК')}</th>
                  <th className={TH}>{t('Протокол')}</th>
               </>
            }
         >
            {meetings.map((meeting) => {
               const opened = open.includes(meeting.id);
               const status = MEETING_STATUS[meeting.status];
               return (
                  <Fragment key={meeting.id}>
                     <tr
                        aria-expanded={opened}
                        className='hover:bg-hover cursor-pointer'
                        tabIndex={0}
                        onClick={() => toggle(meeting.id)}
                        onKeyDown={(event) => {
                           if (event.key !== 'Enter' && event.key !== ' ')
                              return;
                           event.preventDefault();
                           toggle(meeting.id);
                        }}
                     >
                        <td className={TD}>
                           <ChevronRight
                              aria-hidden
                              className={clsx(
                                 'text-ink-soft size-4 transition-transform',
                                 opened && 'rotate-90',
                              )}
                           />
                        </td>
                        <td className={clsx(TD, 'whitespace-nowrap')}>
                           <div className='font-bold'>
                              {meetingName(t, meeting)}
                           </div>
                           <div className='text-ink-soft text-xs'>
                              {meetingType(t, meeting)}
                           </div>
                        </td>
                        <td className={clsx(TD, 'whitespace-nowrap')}>
                           <div className='tabular-nums'>
                              {formatDayYear(meeting.date)}
                              {meeting.time && ` · ${meeting.time}`}
                           </div>
                           {meeting.status === 'planned' && (
                              <div className='text-ink-faint text-xs'>
                                 {relativeDay(tWork, meeting.date)}
                              </div>
                           )}
                        </td>
                        <td className={TD}>
                           <Badge tone={status.tone}>{t(status.label)}</Badge>
                        </td>
                        <td className={clsx(TD, 'min-w-44')}>
                           {meeting.agenda.length ? (
                              meeting.agenda
                                 .map(({ title }) => title)
                                 .join(', ')
                           ) : (
                              <span className='text-ink-faint'>
                                 {t('повестка пуста')}
                              </span>
                           )}
                        </td>
                        <td className={TD}>
                           <div className='flex flex-wrap gap-1'>
                              {meeting.agenda.map((item) => {
                                 const badge = itemBadge(t, meeting, item);
                                 return (
                                    <Badge key={item.id} tone={badge.tone}>
                                       {badge.label}
                                    </Badge>
                                 );
                              })}
                           </div>
                        </td>
                        <td className={clsx(TD, 'text-right tabular-nums')}>
                           {participantsOf(meeting, data.members).length}
                        </td>
                        <td className={TD}>
                           {meeting.protocol === 'none' ? (
                              <span className='text-ink-faint'>—</span>
                           ) : (
                              <Badge
                                 tone={PROTOCOL_STATES[meeting.protocol].tone}
                              >
                                 {t(PROTOCOL_STATES[meeting.protocol].label)}
                              </Badge>
                           )}
                        </td>
                     </tr>
                     {opened && (
                        <tr>
                           <td
                              className='bg-ground/60 px-4.5 py-3.5'
                              colSpan={8}
                           >
                              <MeetingItems data={data} meeting={meeting} />
                           </td>
                        </tr>
                     )}
                  </Fragment>
               );
            })}
         </Table>
         <footer className='border-line text-ink-soft flex flex-wrap justify-between gap-2 border-t px-4.5 py-2.5 text-xs'>
            <span>{t('{{count}} заседание', { count: meetings.length })}</span>
            <span>
               {t('Нажмите на строку, чтобы увидеть вопросы заседания')}
            </span>
         </footer>
      </Card>
   );
};

interface MeetingItemsProps {
   data: CommitteeData;
   meeting: Meeting;
}

// The decisions a question can be given here, besides none.
const DECISIONS: ItemOutcome[] = [
   'approved',
   'approved_conditions',
   'sponsor_approved',
   'rejected',
   'postponed',
];

// A question as its row is being changed.
interface Draft {
   speakerId: string;
   amount: string; // as typed
   outcome: ItemOutcome | '';
}

const CELL = 'field-input text-meta h-8 px-2';
const ROW_ICON =
   'text-ink-soft hover:bg-ground hover:text-ink grid size-7 place-items-center rounded-md';

/* The questions of a meeting, inside its opened row. The secretary or the
   director changes them here whatever the meeting's state: a row's pencil
   turns its sum, its speaker and its decision into fields, its bin takes it
   off the agenda (after asking); a waiting deal is added from the list at
   the foot, and the meeting itself is changed or deleted beside it. */
const MeetingItems = ({ data, meeting }: MeetingItemsProps) => {
   const { t, i18n } = useTranslation('committee');
   const { t: tDeals } = useTranslation('deals');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const navigate = useNavigate();
   const user = useCurrentUser();
   const editable = user.id === meeting.secretaryId || user.role === 'director';
   const held = meeting.status === 'held';
   const [editing, setEditing] = useState<string | null>(null);
   const [draft, setDraft] = useState<Draft>({
      speakerId: '',
      amount: '',
      outcome: '',
   });
   const [amountError, setAmountError] = useState(false);
   const [removingItem, setRemovingItem] = useState<AgendaItem | null>(null);
   const [changing, setChanging] = useState(false);
   const [removing, setRemoving] = useState(false);
   const saving = useAction(
      (
         itemId: string,
         input: Pick<AgendaItem, 'speakerId' | 'amount' | 'outcome'>,
      ) => committee.updateItem(meeting.id, itemId, input),
      { success: t('Вопрос сохранён') },
   );
   const adding = useRequest({
      kind: 'create',
      success: t('Добавлено в повестку'),
   });
   const waiting = waitingDeals(
      data.meetings,
      data.deals,
      meeting.body,
      meeting.stage,
   );
   const decided = data.decisions.some(
      ({ meetingId }) => meetingId === meeting.id,
   );

   const edit = (item: AgendaItem, deal?: Deal) => {
      setEditing(item.id);
      setAmountError(false);
      setDraft({
         speakerId: speakerOf(item, deal),
         amount: item.amount ? String(item.amount) : '',
         outcome: item.outcome ?? '',
      });
   };

   const save = async (item: AgendaItem) => {
      const amount = draft.amount.trim()
         ? parseAmount(draft.amount)
         : undefined;
      if (amount !== undefined && !(amount >= 0)) {
         setAmountError(true);
         return;
      }
      const done = await saving.run(item.id, {
         speakerId: draft.speakerId,
         amount,
         outcome: draft.outcome || null,
      });
      if (done) setEditing(null);
   };

   const keys = (item: AgendaItem) => (event: KeyboardEvent) => {
      if (event.key === 'Enter') void save(item);
      if (event.key === 'Escape') setEditing(null);
   };

   return (
      <div className='border-line overflow-hidden rounded-lg border bg-white'>
         {meeting.agenda.length ? (
            <Table
               className='min-w-5xl'
               head={
                  <>
                     <th className={TH}>{t('Вопрос')}</th>
                     <th className={TH}>{t('Этап сделки')}</th>
                     <th className={clsx(TH, 'text-right')}>{t('Запрос')}</th>
                     <th className={clsx(TH, 'text-right')}>{t('Скоринг')}</th>
                     <th className={TH}>{t('Докладчик')}</th>
                     <th className={TH}>{t('Голоса')}</th>
                     <th className={TH}>{t('Решение')}</th>
                     <th className={TH}>{t('Материалы')}</th>
                     {editable && (
                        <th
                           aria-label={t('Действия')}
                           className={clsx(TH, 'w-20')}
                        />
                     )}
                  </>
               }
            >
               {meeting.agenda.map((item) => {
                  const deal = data.deals.find(({ id }) => id === item.dealId);
                  const stage = deal && headerBadge(tDeals, deal);
                  const score = deal ? scoreOf(deal) : null;
                  const materials =
                     item.kind === 'decision' ? materialsOf(item, deal) : null;
                  const tally = tallyVotes(meeting, data.members, item);
                  const result = itemBadge(t, meeting, item);
                  const open = editing === item.id;
                  const choices: ItemOutcome[] =
                     item.kind === 'info' ? ['noted'] : DECISIONS;
                  return (
                     <tr key={item.id} className={clsx(open && 'bg-ground/60')}>
                        <td className={TD}>
                           <div className='flex items-center gap-2.5'>
                              <CompanyMark
                                 logo={deal?.logo}
                                 name={item.title}
                              />
                              <div className='min-w-0'>
                                 {deal ? (
                                    <Link
                                       className='font-semibold hover:underline'
                                       to={`/deals/${deal.id}`}
                                    >
                                       {item.title}
                                    </Link>
                                 ) : (
                                    <span className='font-semibold'>
                                       {item.title}
                                    </span>
                                 )}
                                 <div className='text-ink-soft text-xs'>
                                    {deal
                                       ? [industryText(deal), roundText(deal)]
                                            .filter(Boolean)
                                            .join(' · ')
                                       : t('Вопрос для информации')}
                                 </div>
                              </div>
                           </div>
                        </td>
                        <td className={TD}>
                           {stage ? (
                              <Badge tone={stage.tone}>{stage.label}</Badge>
                           ) : (
                              <span className='text-ink-faint'>—</span>
                           )}
                        </td>
                        <td
                           className={clsx(
                              TD,
                              'text-right whitespace-nowrap tabular-nums',
                           )}
                        >
                           {open ? (
                              <input
                                 aria-invalid={amountError}
                                 aria-label={t('Запрос, USD: {{title}}', {
                                    title: item.title,
                                 })}
                                 className={clsx(CELL, 'w-28 text-right')}
                                 inputMode='decimal'
                                 maxLength={16}
                                 placeholder={
                                    deal?.amount ? String(deal.amount) : ''
                                 }
                                 value={draft.amount}
                                 onChange={(event) =>
                                    setDraft({
                                       ...draft,
                                       amount: event.target.value,
                                    })
                                 }
                                 onKeyDown={keys(item)}
                              />
                           ) : item.amount || deal?.amount ? (
                              formatUsd(
                                 item.amount || deal?.amount || 0,
                                 language,
                              )
                           ) : (
                              '—'
                           )}
                        </td>
                        <td
                           className={clsx(
                              TD,
                              'text-right whitespace-nowrap tabular-nums',
                           )}
                        >
                           {score === null ? (
                              <span className='text-ink-faint'>—</span>
                           ) : (
                              <b className={scoreClass(score)}>
                                 {t('{{score}} / 5', {
                                    score: score.toFixed(1),
                                 })}
                              </b>
                           )}
                        </td>
                        <td className={clsx(TD, 'whitespace-nowrap')}>
                           {open ? (
                              <select
                                 aria-label={t('Докладчик: {{title}}', {
                                    title: item.title,
                                 })}
                                 className={clsx(CELL, 'select-chevron w-40')}
                                 value={draft.speakerId}
                                 onChange={(event) =>
                                    setDraft({
                                       ...draft,
                                       speakerId: event.target.value,
                                    })
                                 }
                                 onKeyDown={keys(item)}
                              >
                                 <option value=''>{t('не назначен')}</option>
                                 {TEAM.map(({ id, name }) => (
                                    <option key={id} value={id}>
                                       {name}
                                    </option>
                                 ))}
                              </select>
                           ) : (
                              personName(speakerOf(item, deal)) || '—'
                           )}
                        </td>
                        <td
                           className={clsx(
                              TD,
                              'whitespace-nowrap tabular-nums',
                           )}
                        >
                           {item.kind === 'info' ? (
                              <span className='text-ink-faint'>—</span>
                           ) : meeting.status === 'planned' ? (
                              <span className='text-ink-faint'>
                                 {t('голосование не начато')}
                              </span>
                           ) : (
                              <span
                                 data-hint={t('За / против / особое мнение')}
                              >
                                 {[
                                    tally.for,
                                    tally.against,
                                    tally.dissent.length,
                                 ].join(' · ')}
                              </span>
                           )}
                        </td>
                        <td className={TD}>
                           {open ? (
                              <select
                                 aria-label={t('Решение: {{title}}', {
                                    title: item.title,
                                 })}
                                 className={clsx(CELL, 'select-chevron w-48')}
                                 value={draft.outcome}
                                 onChange={(event) =>
                                    setDraft({
                                       ...draft,
                                       outcome: event.target.value as
                                          | ItemOutcome
                                          | '',
                                    })
                                 }
                                 onKeyDown={keys(item)}
                              >
                                 <option value=''>{t('Без решения')}</option>
                                 {choices.map((outcome) => (
                                    <option key={outcome} value={outcome}>
                                       {t(OUTCOMES[outcome].label)}
                                    </option>
                                 ))}
                              </select>
                           ) : (
                              <Badge tone={result.tone}>{result.label}</Badge>
                           )}
                        </td>
                        <td className={clsx(TD, 'whitespace-nowrap')}>
                           {materials ? (
                              <Badge
                                 tone={
                                    materials.ready < materials.total
                                       ? 'warning'
                                       : 'success'
                                 }
                              >
                                 {t('{{ready}} из {{total}}', materials)}
                              </Badge>
                           ) : (
                              <span className='text-ink-faint'>—</span>
                           )}
                        </td>
                        {editable && (
                           <td className={TD}>
                              {open ? (
                                 <span className='flex justify-end'>
                                    <button
                                       type='button'
                                       aria-label={t('Сохранить: {{title}}', {
                                          title: item.title,
                                       })}
                                       className={clsx(ROW_ICON, 'text-accent')}
                                       data-hint={t(
                                          'Сохранить сумму, докладчика и решение',
                                       )}
                                       disabled={saving.pending}
                                       onClick={() => save(item)}
                                    >
                                       {saving.pending ? (
                                          <Spinner className='size-4' />
                                       ) : (
                                          <Check
                                             aria-hidden
                                             className='size-4'
                                          />
                                       )}
                                    </button>
                                    <button
                                       type='button'
                                       aria-label={t('Отменить правку')}
                                       className={ROW_ICON}
                                       data-hint={t(
                                          'Выйти из правки, ничего не меняя',
                                       )}
                                       onClick={() => setEditing(null)}
                                    >
                                       <X aria-hidden className='size-4' />
                                    </button>
                                 </span>
                              ) : (
                                 <ItemActions
                                    icons
                                    deleteLabel={t('Убрать из повестки')}
                                    name={item.title}
                                    onDelete={() => setRemovingItem(item)}
                                    onEdit={() => edit(item, deal)}
                                 />
                              )}
                           </td>
                        )}
                     </tr>
                  );
               })}
            </Table>
         ) : (
            <p className='text-ink-soft px-4.5 py-3'>
               {t('В повестке нет вопросов.')}
            </p>
         )}
         <div className='border-line flex flex-wrap items-center gap-2 border-t px-4.5 py-2.5'>
            <span className='text-ink-soft mr-auto text-xs'>
               {[
                  t('{{count}} вопрос', { count: meeting.agenda.length }),
                  meetingType(t, meeting),
               ].join(' · ')}
            </span>
            {editable && (
               <>
                  {adding.pending && <Spinner className='size-4' />}
                  <select
                     aria-label={t('Добавить в повестку')}
                     className={clsx(CELL, 'select-chevron w-full sm:w-64')}
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
                  <ItemActions
                     className='px-1'
                     name={meetingName(t, meeting)}
                     onDelete={() => setRemoving(true)}
                     onEdit={() => setChanging(true)}
                  />
               </>
            )}
            <Button
               hint={t('Открыть страницу заседания')}
               size='sm'
               variant='ghost'
               onClick={() => navigate(`${COMMITTEE_PATH}/${meeting.id}`)}
            >
               <ArrowUpRight aria-hidden />
               {t('Открыть заседание')}
            </Button>
         </div>
         <ConfirmDialog
            confirmLabel={t('Убрать')}
            error={t('Не удалось убрать из повестки')}
            open={removingItem !== null}
            subtitle={meetingName(t, meeting)}
            success={t('Убрано из повестки')}
            title={t('Убрать «{{title}}» из повестки?', {
               title: removingItem?.title ?? '',
            })}
            onClose={() => setRemovingItem(null)}
            onConfirm={() =>
               removingItem &&
               committee.removeFromAgenda(meeting.id, removingItem.id)
            }
         >
            <p>
               {held
                  ? t(
                       'Вопрос уйдёт из повестки вместе с голосами; решение по нему удалится из реестра.',
                    )
                  : t(
                       'Вопрос уйдёт из повестки вместе с голосами по нему; сделка перестанет ждать это заседание.',
                    )}
            </p>
         </ConfirmDialog>
         <MeetingDialog
            meeting={meeting}
            open={changing}
            onClose={() => setChanging(false)}
         />
         <ConfirmDialog
            open={removing}
            subtitle={`${meetingName(t, meeting)} · ${formatDayYear(meeting.date)}`}
            success={t('Заседание удалено')}
            title={t('Удалить заседание?')}
            onClose={() => setRemoving(false)}
            onConfirm={() => committee.deleteMeeting(meeting.id)}
         >
            <p>
               {decided
                  ? t(
                       'Заседание удалится вместе с повесткой, голосами и его решениями в реестре; задачи по условиям останутся в «Задачах».',
                    )
                  : t(
                       'Заседание удалится вместе с повесткой и списком участников; сделки с повестки снова будут ждать заседания.',
                    )}
            </p>
         </ConfirmDialog>
      </div>
   );
};

export default MeetingTable;
