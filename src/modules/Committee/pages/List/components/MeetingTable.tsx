import MeetingDialog from '@modules/Committee/components/MeetingDialog';
import {
   COMMITTEE_PATH,
   MEETING_STATUS,
   OUTCOMES,
   PROTOCOL_STATES,
} from '@modules/Committee/constants';
import {
   formatName,
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
import { relativeDay } from '@modules/Work/helpers';
import {
   ActionMenu,
   Badge,
   Button,
   Card,
   CompanyMark,
   ConfirmDialog,
   Field,
   type MenuAction,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
   NoData,
   Segmented,
   Table,
   TD,
   TH,
} from '@shared/components';
import { stageName } from '@modules/Settings/services';
import { TEAM } from '@shared/constants';
import {
   formatDayYear,
   formatMoneyShort,
   formatNumericDate,
   parseAmount,
   personName,
} from '@shared/helpers';
import { useAction, useCurrentUser, useServiceData } from '@shared/hooks';
import attachments from '@shared/services/attachments';
import type {
   AgendaItem,
   ItemOutcome,
   Meeting,
} from '@shared/types/committee.types';
import type { Deal } from '@shared/types/deals.types';
import clsx from 'clsx';
import { ArrowUpRight, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { type FormEvent, Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';

interface MeetingTableProps {
   data: CommitteeData;
}

const loadFiles = () => attachments.getAll();
const subscribeFiles = (listener: () => void) =>
   attachments.subscribe(listener);

/* «Таблица»: the register of the meetings, newest first, as the design draws
   it — the number, the date, the status, the questions, their results, how
   many members sit and how many files the meeting has. A row opens in place
   to show its questions; what is added, changed or deleted there goes
   through the «⋯» of a question or «Действия» at the foot, each in a window. */
const MeetingTable = ({ data }: MeetingTableProps) => {
   const { t } = useTranslation('committee');
   const { t: tWork } = useTranslation('work');
   const [open, setOpen] = useState<string[]>([]);
   const files = useServiceData(loadFiles, subscribeFiles) ?? [];
   const meetings = [...data.meetings].sort((a, b) =>
      b.date.localeCompare(a.date),
   );

   const toggle = (id: string) =>
      setOpen((ids) =>
         ids.includes(id) ? ids.filter((one) => one !== id) : [...ids, id],
      );

   // the meeting's files and recordings, and its signed protocol
   const filesOf = (meeting: Meeting) => {
      const items = new Set(meeting.agenda.map(({ id }) => id));
      return (
         files.filter(
            ({ section, itemId }) =>
               (section === 'committee' || section === 'committee_record') &&
               items.has(itemId),
         ).length + (meeting.protocolFile ? 1 : 0)
      );
   };

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
                  <th className={TH}>{t('№')}</th>
                  <th className={TH}>{t('Дата')}</th>
                  <th className={TH}>{t('Статус')}</th>
                  <th className={TH}>{t('Вопросы повестки')}</th>
                  <th className={TH}>{t('Итоги')}</th>
                  <th className={clsx(TH, 'text-right')}>{t('Члены ИК')}</th>
                  <th className={clsx(TH, 'text-right')}>{t('Материалы')}</th>
               </>
            }
         >
            {meetings.map((meeting) => {
               const opened = open.includes(meeting.id);
               const status = MEETING_STATUS[meeting.status];
               const count = filesOf(meeting);
               return (
                  <Fragment key={meeting.id}>
                     <tr
                        aria-expanded={opened}
                        className={clsx(
                           'hover:bg-hover cursor-pointer',
                           opened && 'bg-ground/60',
                        )}
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
                           <div className='font-bold tabular-nums'>
                              {meeting.number}
                           </div>
                           <div className='text-ink-faint text-xs'>
                              {meetingType(t, meeting)}
                           </div>
                        </td>
                        <td className={clsx(TD, 'whitespace-nowrap')}>
                           <div className='tabular-nums'>
                              {formatNumericDate(meeting.date)}
                           </div>
                           <div className='text-ink-faint text-xs'>
                              {meeting.status === 'planned'
                                 ? relativeDay(tWork, meeting.date)
                                 : meeting.time}
                           </div>
                        </td>
                        <td className={TD}>
                           <Badge tone={status.tone}>{t(status.label)}</Badge>
                           {meeting.protocol !== 'none' && (
                              <div className='text-ink-faint mt-1 text-xs'>
                                 {t('протокол: {{state}}', {
                                    state: t(
                                       PROTOCOL_STATES[meeting.protocol].label,
                                    ).toLowerCase(),
                                 })}
                              </div>
                           )}
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
                        <td
                           className={clsx(TD, 'text-right tabular-nums')}
                           data-hint={t(
                              'Файлы и записи по вопросам и подписанный протокол',
                           )}
                        >
                           {count || <span className='text-ink-faint'>—</span>}
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

/* The questions of a meeting, inside its opened row, as the design draws
   them: the startup, its stage, the sum asked, the score, the manager who
   presents it, the votes, the decision and the materials, and a link to the
   deal. The secretary or the director changes a question by its «⋯» (in a
   window) or takes it off the agenda; «Действия» at the foot adds startups,
   changes the meeting or deletes it — whatever the meeting's state. */
const MeetingItems = ({ data, meeting }: MeetingItemsProps) => {
   const { t } = useTranslation('committee');
   const { t: tDeals } = useTranslation('deals');
   const navigate = useNavigate();
   const user = useCurrentUser();
   const editable = user.id === meeting.secretaryId || user.role === 'director';
   const held = meeting.status === 'held';
   const [editing, setEditing] = useState<AgendaItem | null>(null);
   const [removingItem, setRemovingItem] = useState<AgendaItem | null>(null);
   const [adding, setAdding] = useState(false);
   const [changing, setChanging] = useState(false);
   const [removing, setRemoving] = useState(false);
   const waiting = waitingDeals(
      data.meetings,
      data.deals,
      meeting.body,
      meeting.stage,
   );
   const decided = data.decisions.some(
      ({ meetingId }) => meetingId === meeting.id,
   );
   const startups = meeting.agenda.filter(({ dealId }) => dealId).length;
   // other deals in work that no coming meeting has on its agenda
   const elsewhere = new Set(
      data.meetings
         .filter(({ id, status }) => id !== meeting.id && status !== 'held')
         .flatMap(({ agenda }) => agenda.map(({ dealId }) => dealId)),
   );
   const others = data.deals.filter(
      (deal) =>
         (deal.status === 'active' || deal.status === 'review') &&
         !waiting.includes(deal) &&
         !elsewhere.has(deal.id) &&
         !meeting.agenda.some(({ dealId }) => dealId === deal.id),
   );

   const actions: MenuAction[] = editable
      ? [
           {
              label: t('Изменить заседание'),
              icon: Pencil,
              hint: t('Изменить дату, время и формат заседания'),
              onSelect: () => setChanging(true),
           },
           {
              label: t('Удалить заседание'),
              icon: Trash2,
              danger: true,
              hint: t('Удалить заседание с его повесткой'),
              onSelect: () => setRemoving(true),
           },
        ]
      : [];

   /* Fits the meetings' table with no sideways scroll: the request shows its
      score under it, the decision its votes, and the startup's name opens
      its deal. Its width does not count in the meetings' table, so opening a
      meeting leaves the columns where they are. */
   return (
      <div className='border-line overflow-hidden rounded-lg border bg-white [contain:inline-size]'>
         {meeting.agenda.length ? (
            <Table
               head={
                  <>
                     <th className={TH}>{t('Стартап (сделка)')}</th>
                     <th className={TH}>{t('Этап')}</th>
                     <th className={clsx(TH, 'text-right')}>{t('Запрос')}</th>
                     <th className={TH}>{t('Менеджер')}</th>
                     <th className={TH}>{t('Решение')}</th>
                     <th className={TH}>{t('Материалы')}</th>
                     <th aria-label={t('Действия')} className={TH} />
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
                  return (
                     <tr key={item.id}>
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
                                       data-hint={t('Открыть карточку сделки')}
                                       to={`/deals/${deal.id}`}
                                    >
                                       {item.title}
                                    </Link>
                                 ) : (
                                    <div className='font-semibold'>
                                       {item.title}
                                    </div>
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
                           <div>
                              {item.amount || deal?.amount
                                 ? formatMoneyShort(
                                      item.amount || deal?.amount || 0,
                                   )
                                 : '—'}
                           </div>
                           {score !== null && (
                              <div
                                 className={clsx(
                                    'text-xs font-semibold',
                                    scoreClass(score),
                                 )}
                                 data-hint={t('Скоринг')}
                              >
                                 {t('{{score}} / 5', {
                                    score: score.toFixed(1),
                                 })}
                              </div>
                           )}
                        </td>
                        <td className={TD}>
                           {personName(speakerOf(item, deal)) || '—'}
                        </td>
                        <td className={TD}>
                           <Badge tone={result.tone}>{result.label}</Badge>
                           {item.kind !== 'info' &&
                              (meeting.status === 'planned' ? (
                                 <div className='text-ink-faint mt-0.5 text-xs'>
                                    {t('голосование не начато')}
                                 </div>
                              ) : (
                                 <div
                                    className='text-ink-soft mt-0.5 text-xs tabular-nums'
                                    data-hint={t('За / против / особое мнение')}
                                 >
                                    {`${t('Голоса')}: ${[
                                       tally.for,
                                       tally.against,
                                       tally.dissent.length,
                                    ].join(' · ')}`}
                                 </div>
                              ))}
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
                        <td className={clsx(TD, 'w-0 whitespace-nowrap')}>
                           {editable && (
                              <ActionMenu
                                 actions={[
                                    {
                                       label: t('Изменить вопрос'),
                                       icon: Pencil,
                                       hint: t(
                                          'Изменить сумму, докладчика и решение',
                                       ),
                                       onSelect: () => setEditing(item),
                                    },
                                    {
                                       label: t('Убрать из повестки'),
                                       icon: Trash2,
                                       danger: true,
                                       onSelect: () => setRemovingItem(item),
                                    },
                                 ]}
                                 name={item.title}
                              />
                           )}
                        </td>
                     </tr>
                  );
               })}
            </Table>
         ) : (
            <p className='text-ink-soft px-4.5 py-3'>
               {t('В повестке нет вопросов.')}
            </p>
         )}
         <div className='border-line flex flex-wrap items-center gap-2 border-t px-4.5 py-3'>
            <span className='text-ink-soft text-meta mr-auto'>
               {[
                  t('{{count}} стартап', { count: startups }),
                  formatName(t, meeting.format),
                  meeting.time,
               ]
                  .filter(Boolean)
                  .join(' · ')}
            </span>
            {editable && (
               <Button
                  hint={t(
                     'Добавить в повестку стартап или вопрос для информации, сразу с решением',
                  )}
                  onClick={() => setAdding(true)}
               >
                  <Plus aria-hidden />
                  {t('Добавить')}
               </Button>
            )}
            <ActionMenu
               bordered
               actions={actions}
               label={t('Изменить или удалить заседание')}
               name={meetingName(t, meeting)}
               text={t('Действия')}
            />
            <Button
               hint={t('Открыть страницу заседания')}
               variant='ghost'
               onClick={() => navigate(`${COMMITTEE_PATH}/${meeting.id}`)}
            >
               <ArrowUpRight aria-hidden />
               {t('Открыть заседание')}
            </Button>
         </div>
         <ItemDialog
            item={editing}
            meeting={meeting}
            deal={data.deals.find(({ id }) => id === editing?.dealId)}
            onClose={() => setEditing(null)}
         />
         <AddDialog
            meeting={meeting}
            open={adding}
            others={others}
            waiting={waiting}
            onClose={() => setAdding(false)}
         />
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

interface ItemDialogProps {
   meeting: Meeting;
   item: AgendaItem | null; // null: closed
   deal?: Deal;
   onClose: () => void;
}

// A question changed in a window: the sum asked, who presents it, its decision.
const ItemDialog = ({ meeting, item, deal, onClose }: ItemDialogProps) => {
   const { t } = useTranslation('committee');
   return (
      <Modal
         open={item !== null}
         subtitle={meetingName(t, meeting)}
         title={item?.title ?? ''}
         onClose={onClose}
      >
         {item && (
            <ItemForm
               deal={deal}
               item={item}
               meeting={meeting}
               onClose={onClose}
            />
         )}
      </Modal>
   );
};

const ItemForm = ({
   meeting,
   item,
   deal,
   onClose,
}: Omit<ItemDialogProps, 'item'> & { item: AgendaItem }) => {
   const { t } = useTranslation('committee');
   const [amount, setAmount] = useState(item.amount ? String(item.amount) : '');
   const [speakerId, setSpeakerId] = useState(speakerOf(item, deal));
   const [outcome, setOutcome] = useState<ItemOutcome | ''>(item.outcome ?? '');
   const [error, setError] = useState('');
   const saving = useAction(
      (input: Pick<AgendaItem, 'speakerId' | 'amount' | 'outcome'>) =>
         committee.updateItem(meeting.id, item.id, input),
      { success: t('Вопрос сохранён') },
   );
   const choices: ItemOutcome[] = item.kind === 'info' ? ['noted'] : DECISIONS;

   const submit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const sum = amount.trim() ? parseAmount(amount) : undefined;
      if (sum !== undefined && !(sum >= 0)) {
         setError(t('Укажите сумму в долларах'));
         return;
      }
      if (
         await saving.run({
            speakerId,
            amount: sum,
            outcome: outcome || null,
         })
      )
         onClose();
   };

   return (
      <form noValidate className={MODAL_FORM} onSubmit={submit}>
         <ModalBody>
            <div className='grid gap-4 sm:grid-cols-2'>
               <Field error={error} label={t('Запрос, USD')}>
                  <input
                     data-autofocus
                     aria-invalid={!!error}
                     className='field-input'
                     inputMode='decimal'
                     maxLength={16}
                     placeholder={deal?.amount ? String(deal.amount) : ''}
                     value={amount}
                     onChange={(event) => {
                        setAmount(event.target.value);
                        setError('');
                     }}
                  />
               </Field>
               <Field label={t('Менеджер (докладчик)')}>
                  <select
                     className='field-input'
                     value={speakerId}
                     onChange={(event) => setSpeakerId(event.target.value)}
                  >
                     <option value=''>{t('не назначен')}</option>
                     {TEAM.map(({ id, name }) => (
                        <option key={id} value={id}>
                           {name}
                        </option>
                     ))}
                  </select>
               </Field>
               <Field className='sm:col-span-2' label={t('Решение')}>
                  <select
                     className='field-input'
                     value={outcome}
                     onChange={(event) =>
                        setOutcome(event.target.value as ItemOutcome | '')
                     }
                  >
                     <option value=''>{t('Без решения')}</option>
                     {choices.map((choice) => (
                        <option key={choice} value={choice}>
                           {t(OUTCOMES[choice].label)}
                        </option>
                     ))}
                  </select>
               </Field>
            </div>
         </ModalBody>
         <ModalFooter
            note={
               meeting.status === 'held'
                  ? t('Решение заседания попадёт в реестр и в карточку сделки.')
                  : undefined
            }
         >
            <Button
               hint={t('Закрыть окно, ничего не меняя')}
               variant='text'
               onClick={onClose}
            >
               {t('Отмена')}
            </Button>
            <Button
               hint={t('Сохранить сумму, докладчика и решение')}
               loading={saving.pending}
               type='submit'
            >
               {t('Сохранить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

interface AddDialogProps {
   meeting: Meeting;
   waiting: Deal[]; // the deals waiting for this meeting
   others: Deal[]; // other deals in work, on no other coming meeting
   open: boolean;
   onClose: () => void;
}

type AddKind = 'deal' | 'info';

/* A question put on the meeting in a window, whatever the meeting's state:
   a startup — one waiting for this meeting, or another deal in work — or a
   question for information; with the sum asked, who presents it and its
   decision, so a held meeting's row gets its status at once. */
const AddDialog = ({
   meeting,
   waiting,
   others,
   open,
   onClose,
}: AddDialogProps) => {
   const { t } = useTranslation('committee');
   return (
      <Modal
         open={open}
         subtitle={meetingName(t, meeting)}
         title={t('Добавить в повестку')}
         onClose={onClose}
      >
         {open && (
            <AddForm
               meeting={meeting}
               others={others}
               waiting={waiting}
               onClose={onClose}
            />
         )}
      </Modal>
   );
};

const AddForm = ({
   meeting,
   waiting,
   others,
   onClose,
}: Omit<AddDialogProps, 'open'>) => {
   const { t } = useTranslation('committee');
   const [kind, setKind] = useState<AddKind>(
      waiting.length || others.length ? 'deal' : 'info',
   );
   const [dealId, setDealId] = useState(waiting[0]?.id ?? '');
   const [title, setTitle] = useState('');
   const [amount, setAmount] = useState('');
   const [speakerId, setSpeakerId] = useState(waiting[0]?.ownerId ?? '');
   const [outcome, setOutcome] = useState<ItemOutcome | ''>('');
   const [error, setError] = useState('');
   const adding = useAction(
      (input: Parameters<typeof committee.addQuestion>[1]) =>
         committee.addQuestion(meeting.id, input),
      { kind: 'create', success: t('Добавлено в повестку') },
   );
   const deal = [...waiting, ...others].find(({ id }) => id === dealId);
   const choices: ItemOutcome[] = kind === 'info' ? ['noted'] : DECISIONS;

   const submit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (kind === 'deal' && !deal) return setError(t('Выберите сделку'));
      if (kind === 'info' && !title.trim())
         return setError(t('Опишите вопрос'));
      const sum = amount.trim() ? parseAmount(amount) : undefined;
      if (sum !== undefined && !(sum >= 0))
         return setError(t('Укажите сумму в долларах'));
      if (
         await adding.run({
            ...(kind === 'deal' ? { dealId } : { title }),
            amount: sum,
            speakerId,
            outcome: outcome || null,
         })
      )
         onClose();
   };

   const option = (one: Deal) => (
      <option key={one.id} value={one.id}>
         {[one.company, stageName(one.stage)].join(' · ')}
      </option>
   );

   return (
      <form noValidate className={MODAL_FORM} onSubmit={submit}>
         <ModalBody>
            <div className='grid gap-4 sm:grid-cols-2'>
               <div className='sm:col-span-2'>
                  <Segmented
                     items={[
                        { id: 'deal', label: t('Стартап (сделка)') },
                        { id: 'info', label: t('Вопрос для информации') },
                     ]}
                     label={t('Что добавить')}
                     value={kind}
                     onChange={(next) => {
                        setKind(next);
                        setOutcome('');
                        setError('');
                     }}
                  />
               </div>
               {kind === 'deal' ? (
                  <Field
                     className='sm:col-span-2'
                     error={error}
                     hint={
                        deal && !waiting.includes(deal)
                           ? t(
                                'Сделка не на этапе этого заседания: её этап не изменится.',
                             )
                           : undefined
                     }
                     label={t('Сделка')}
                  >
                     <select
                        data-autofocus
                        aria-invalid={!!error}
                        className='field-input'
                        value={dealId}
                        onChange={(event) => {
                           const next = [...waiting, ...others].find(
                              ({ id }) => id === event.target.value,
                           );
                           setDealId(event.target.value);
                           setSpeakerId(next?.ownerId ?? '');
                           setError('');
                        }}
                     >
                        <option value=''>{t('Выберите сделку')}</option>
                        {waiting.length > 0 && (
                           <optgroup label={t('Ждут этого заседания')}>
                              {waiting.map(option)}
                           </optgroup>
                        )}
                        {others.length > 0 && (
                           <optgroup label={t('Другие сделки в работе')}>
                              {others.map(option)}
                           </optgroup>
                        )}
                     </select>
                  </Field>
               ) : (
                  <Field
                     className='sm:col-span-2'
                     error={error}
                     label={t('Вопрос')}
                  >
                     <input
                        data-autofocus
                        aria-invalid={!!error}
                        className='field-input'
                        maxLength={200}
                        placeholder={t('Например, отчёт о портфеле за квартал')}
                        value={title}
                        onChange={(event) => {
                           setTitle(event.target.value);
                           setError('');
                        }}
                     />
                  </Field>
               )}
               {kind === 'deal' && (
                  <Field label={t('Запрос, USD')}>
                     <input
                        className='field-input'
                        inputMode='decimal'
                        maxLength={16}
                        placeholder={deal?.amount ? String(deal.amount) : ''}
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                     />
                  </Field>
               )}
               <Field label={t('Менеджер (докладчик)')}>
                  <select
                     className='field-input'
                     value={speakerId}
                     onChange={(event) => setSpeakerId(event.target.value)}
                  >
                     <option value=''>{t('не назначен')}</option>
                     {TEAM.map(({ id, name }) => (
                        <option key={id} value={id}>
                           {name}
                        </option>
                     ))}
                  </select>
               </Field>
               <Field
                  className={clsx(kind === 'info' && 'sm:col-span-2')}
                  label={t('Решение (статус)')}
               >
                  <select
                     className='field-input'
                     value={outcome}
                     onChange={(event) =>
                        setOutcome(event.target.value as ItemOutcome | '')
                     }
                  >
                     <option value=''>
                        {meeting.status === 'held'
                           ? t('Без решения')
                           : t('Ожидается')}
                     </option>
                     {choices.map((choice) => (
                        <option key={choice} value={choice}>
                           {t(OUTCOMES[choice].label)}
                        </option>
                     ))}
                  </select>
               </Field>
            </div>
         </ModalBody>
         <ModalFooter
            note={
               meeting.status === 'held' && kind === 'deal'
                  ? t('Решение заседания попадёт в реестр и в карточку сделки.')
                  : undefined
            }
         >
            <Button
               hint={t('Закрыть окно, ничего не меняя')}
               variant='text'
               onClick={onClose}
            >
               {t('Отмена')}
            </Button>
            <Button
               hint={t('Поставить вопрос в повестку')}
               loading={adding.pending}
               type='submit'
            >
               {t('Добавить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

export default MeetingTable;
