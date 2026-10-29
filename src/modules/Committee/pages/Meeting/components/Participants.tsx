import MemberDialog from '@modules/Committee/components/MemberDialog';
import {
   ATTENDANCE,
   ATTENDANCE_ORDER,
   IC_RULES,
   MEMBER_ROLE_LABELS,
} from '@modules/Committee/constants';
import {
   activeMembers,
   attendedMembers,
   participantsOf,
} from '@modules/Committee/helpers';
import type { CommitteeData } from '@modules/Committee/hooks';
import committee from '@modules/Committee/services';
import {
   Avatar,
   Badge,
   BadgeSelect,
   Button,
   Card,
   ChoiceCards,
   ConfirmDialog,
   ItemActions,
   NoData,
   Table,
   TD,
   TH,
} from '@shared/components';
import { useAction, useRequest } from '@shared/hooks';
import type {
   Attendance,
   CommitteeMember,
   Meeting,
} from '@shared/types/committee.types';
import clsx from 'clsx';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ParticipantsProps {
   data: CommitteeData;
   meeting: Meeting;
   editable: boolean; // the secretary or the director
}

// Taking a person off: from this meeting only, or off the committee too.
type Removal = 'meeting' | 'committee';

/* «Участники ИК», as the design draws them: a table of who sits at the
   meeting, its chair picked among them. They are picked when it is scheduled
   and changed here until it opens — a person of the committee asked or taken
   off (from the meeting, or from the committee too), a new one added,
   anyone's role and contract corrected. Before the meeting the secretary
   marks who will come; the quorum counts those who confirmed. */
const Participants = ({ data, meeting, editable }: ParticipantsProps) => {
   const { t } = useTranslation('committee');
   const [editing, setEditing] = useState<CommitteeMember | 'new' | null>(null);
   const [picked, setPicked] = useState('');
   const adding = useRequest({
      kind: 'create',
      success: t('Добавлен в участники заседания'),
   });
   const marking = useAction(
      (memberId: string, value: Attendance) =>
         committee.setAttendance(meeting.id, memberId, value),
      { success: t('Участие отмечено') },
   );
   const choosing = useAction(
      (memberId: string) => committee.setChair(meeting.id, memberId),
      { success: t('Председатель назначен') },
   );
   // the member whose answer is being saved
   const [markingId, setMarkingId] = useState('');
   const [removing, setRemoving] = useState<CommitteeMember | null>(null);
   const [removal, setRemoval] = useState<Removal>('meeting');
   const planned = meeting.status === 'planned';
   const changeable = editable && planned;
   const participants = participantsOf(meeting, data.members);
   const attended = attendedMembers(meeting, data.members);
   const others = activeMembers(data.members).filter(
      ({ id }) => !participants.some((member) => member.id === id),
   );
   const confirmed = participants.filter(
      ({ id }) => meeting.attendance[id] === 'confirmed',
   ).length;

   const remove = (member: CommitteeMember) => {
      setRemoval('meeting');
      setRemoving(member);
   };

   return (
      <Card
         action={
            changeable && (
               <button
                  type='button'
                  className='link'
                  onClick={() => setEditing('new')}
               >
                  {t('Новый участник')}
               </button>
            )
         }
         className='flex flex-1 flex-col'
         hint={t('{{confirmed}} из {{total}} подтвердили · кворум {{quorum}}', {
            confirmed,
            total: participants.length,
            quorum: IC_RULES.quorum,
         })}
         title={t('Участники ИК')}
      >
         {participants.length ? (
            <Table
               className='min-w-3xl'
               head={
                  <>
                     <th className={TH}>{t('Участник')}</th>
                     <th className={TH}>{t('Роль в ИК')}</th>
                     <th className={TH}>{t('Основание')}</th>
                     <th className={clsx(TH, 'text-center')}>
                        {t('Председатель')}
                     </th>
                     <th className={TH}>
                        {planned ? t('Участие') : t('Присутствие')}
                     </th>
                     {editable && (
                        <th
                           aria-label={t('Действия')}
                           className={clsx(TH, 'w-20')}
                        />
                     )}
                  </>
               }
            >
               {participants.map((member) => {
                  const attendance =
                     meeting.attendance[member.id] ?? 'no_answer';
                  const chair = member.id === meeting.chairId;
                  return (
                     <tr key={member.id}>
                        <td className={TD}>
                           <div className='flex items-center gap-2.5'>
                              <Avatar name={member.name} size='md' />
                              <div className='min-w-0'>
                                 <div className='font-semibold'>
                                    {member.name}
                                 </div>
                                 <div className='text-ink-soft text-xs'>
                                    {[
                                       member.remote && t('по видео'),
                                       member.employeeId &&
                                          t('из команды фонда'),
                                       member.retired &&
                                          t('вышел из состава ИК'),
                                    ]
                                       .filter(Boolean)
                                       .join(' · ') || t('очно')}
                                 </div>
                              </div>
                           </div>
                        </td>
                        <td className={TD}>
                           {t(MEMBER_ROLE_LABELS[member.role])}
                        </td>
                        <td className={clsx(TD, 'text-ink-soft')}>
                           {member.contract || '—'}
                        </td>
                        <td className={clsx(TD, 'text-center')}>
                           {changeable ? (
                              <input
                                 type='radio'
                                 aria-label={t('Председатель: {{name}}', {
                                    name: member.name,
                                 })}
                                 checked={chair}
                                 className='accent-accent size-4 cursor-pointer align-middle'
                                 disabled={choosing.pending}
                                 name={`chair-${meeting.id}`}
                                 onChange={() => choosing.run(member.id)}
                              />
                           ) : chair ? (
                              <Badge tone='indigo'>{t('Председатель')}</Badge>
                           ) : (
                              <span className='text-ink-faint'>—</span>
                           )}
                        </td>
                        <td className={TD}>
                           {!planned ? (
                              attended.includes(member) ? (
                                 <Badge tone='success'>
                                    {t('Присутствовал')}
                                 </Badge>
                              ) : (
                                 <Badge tone='neutral'>
                                    {t('Отсутствовал')}
                                 </Badge>
                              )
                           ) : changeable ? (
                              <BadgeSelect<Attendance>
                                 busy={markingId === member.id}
                                 label={t('Участие: {{name}}', {
                                    name: member.name,
                                 })}
                                 options={ATTENDANCE_ORDER.map((value) => ({
                                    value,
                                    label: t(ATTENDANCE[value].label),
                                    tone: ATTENDANCE[value].tone,
                                 }))}
                                 value={attendance}
                                 onChange={async (value) => {
                                    setMarkingId(member.id);
                                    await marking.run(member.id, value);
                                    setMarkingId('');
                                 }}
                              />
                           ) : (
                              <Badge tone={ATTENDANCE[attendance].tone}>
                                 {t(ATTENDANCE[attendance].label)}
                              </Badge>
                           )}
                        </td>
                        {editable && (
                           <td className={TD}>
                              <ItemActions
                                 icons
                                 deleteLabel={t('Убрать')}
                                 name={member.name}
                                 onDelete={
                                    changeable
                                       ? () => remove(member)
                                       : undefined
                                 }
                                 onEdit={() => setEditing(member)}
                              />
                           </td>
                        )}
                     </tr>
                  );
               })}
            </Table>
         ) : (
            <NoData>{t('Участников пока нет')}</NoData>
         )}
         {changeable && others.length > 0 && (
            <div className='border-line flex flex-wrap items-center gap-2.5 border-t px-4.5 py-3.5'>
               <select
                  aria-label={t('Кого добавить')}
                  className='field-input select-chevron max-w-xs flex-1'
                  value={picked}
                  onChange={(event) => setPicked(event.target.value)}
               >
                  <option value=''>{t('Добавить из участников ИК…')}</option>
                  {others.map((member) => (
                     <option key={member.id} value={member.id}>
                        {member.name} · {t(MEMBER_ROLE_LABELS[member.role])}
                     </option>
                  ))}
               </select>
               <Button
                  disabled={!picked}
                  loading={adding.pending}
                  variant='ghost'
                  onClick={async () => {
                     if (
                        await adding.run(() =>
                           committee.addParticipant(meeting.id, picked),
                        )
                     )
                        setPicked('');
                  }}
               >
                  {t('Добавить')}
               </Button>
            </div>
         )}
         <p className='text-ink-soft border-line mt-auto border-t px-4.5 py-2.5 text-xs'>
            {planned
               ? t(
                    'Участников меняют до открытия заседания. Кворум — не меньше {{count}} подтвердивших.',
                    { count: IC_RULES.quorum },
                 )
               : t('После открытия заседания состав не меняется.')}
         </p>
         <MemberDialog
            member={editing}
            onClose={() => setEditing(null)}
            onCreated={(id) => committee.addParticipant(meeting.id, id)}
         />
         <ConfirmDialog
            confirmLabel={t('Убрать')}
            error={t('Не удалось убрать участника')}
            open={removing !== null}
            success={
               removal === 'committee'
                  ? t('Убран из состава ИК')
                  : t('Убран из участников заседания')
            }
            title={t('Убрать {{name}}?', { name: removing?.name ?? '' })}
            onClose={() => setRemoving(null)}
            onConfirm={() =>
               removing &&
               (removal === 'committee'
                  ? committee.retireMember(removing.id)
                  : committee.removeParticipant(meeting.id, removing.id))
            }
         >
            <ChoiceCards<Removal>
               label={t('Откуда убрать')}
               name='removal'
               options={[
                  {
                     value: 'meeting',
                     label: t('С этого заседания'),
                     note: t(
                        'На другие заседания его по-прежнему можно позвать.',
                     ),
                  },
                  {
                     value: 'committee',
                     label: t('Из состава ИК'),
                     note: t(
                        'Его снимут со всех назначенных заседаний и больше не будут предлагать; в прошлых заседаниях и протоколах он останется.',
                     ),
                  },
               ]}
               value={removal}
               onChange={setRemoval}
            />
         </ConfirmDialog>
      </Card>
   );
};

export default Participants;
