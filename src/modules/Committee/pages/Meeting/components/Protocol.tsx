import { stageName } from '@modules/Settings/services';
import {
   IC_RULES,
   MEMBER_ROLE_LABELS,
   OUTCOMES,
   PROTOCOL_FIELDS,
} from '@modules/Committee/constants';
import {
   attendedMembers,
   formatName,
   hasQuorum,
   participantsOf,
   speakerOf,
   tallyVotes,
} from '@modules/Committee/helpers';
import type { CommitteeData } from '@modules/Committee/hooks';
import committee from '@modules/Committee/services';
import { industryText, roundText } from '@modules/Deals/helpers';
import { Button } from '@shared/components';
import { formatUsd, personName } from '@shared/helpers';
import { toast } from '@shared/helpers/toast';
import { useAction, useAttachments } from '@shared/hooks';
import type {
   AgendaItem,
   CommitteeMember,
   Meeting,
} from '@shared/types/committee.types';
import type { Deal } from '@shared/types/deals.types';
import dayjs from 'dayjs';
import type { TFunction } from 'i18next';
import { Copy, Printer } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type T = TFunction<'committee'>;

interface ProtocolProps {
   data: CommitteeData;
   meeting: Meeting;
   editable: boolean; // the secretary or the director
}

const H3 = 'mt-5 mb-1.5 font-bold';
const P = 'mb-2';

// "Об инвестировании в EasyTap (ИК-2)", or an information item's question.
const agendaLine = (t: T, item: AgendaItem) =>
   item.kind === 'info'
      ? item.title
      : [
           t('Об инвестировании в {{company}}', { company: item.title }),
           item.stage && `(${stageName(item.stage)})`,
        ]
           .filter(Boolean)
           .join(' ');

// "одобрено с условиями — …", or that the vote is not over yet.
const decisionLine = (t: T, item: AgendaItem) =>
   item.outcome
      ? [t(OUTCOMES[item.outcome].label).toLowerCase(), item.outcomeNote]
           .filter(Boolean)
           .join(' — ')
      : t('голосование не завершено');

// A member with their place in the committee: "Иванов И. (председатель ИК)".
const memberLine = (t: T, member: CommitteeMember) =>
   `${member.name} (${t(MEMBER_ROLE_LABELS[member.role])})`;

// «за» — 3, «против» — 1, особое мнение — 0.
const votesLine = (
   t: T,
   meeting: Meeting,
   data: CommitteeData,
   item: AgendaItem,
) => {
   const tally = tallyVotes(meeting, data.members, item);
   return t(
      '«за» — {{for}}, «против» — {{against}}, особое мнение — {{dissent}}.',
      { ...tally, dissent: tally.dissent.length },
   );
};

/* «Протокол», as the design draws it: the protocol's sheet, gathered from
   the agenda, who sat and the votes. Until the meeting is held the secretary
   writes the arguments, the conditions of an approval and the next step on
   the sheet itself; the conditions become the deal owner's tasks when the
   protocol is formed. The text can be copied and the sheet printed. */
const Protocol = ({ data, meeting, editable }: ProtocolProps) => {
   const { t } = useTranslation('committee');
   const writable = editable && meeting.status !== 'held';
   const planned = meeting.status === 'planned';
   const participants = participantsOf(meeting, data.members);
   const present = planned
      ? participants.filter(({ id }) => meeting.attendance[id] === 'confirmed')
      : attendedMembers(meeting, data.members);
   const absent = participants.filter((member) => !present.includes(member));
   const chair = data.members.find(({ id }) => id === meeting.chairId);
   const secretary = personName(meeting.secretaryId) || '—';
   const date = dayjs(meeting.date).format('D MMMM YYYY');
   const number = t('Протокол № {{number}}', { number: meeting.number });
   const of =
      meeting.body === 'board'
         ? t('заседания Наблюдательного совета ООО «SQB Ventures»')
         : t('заседания Инвестиционного комитета ООО «SQB Ventures»');
   const quorum = hasQuorum(present.length)
      ? t('Кворум имеется: {{present}} из {{total}}.', {
           present: present.length,
           total: participants.length,
        })
      : t('Кворума нет: {{present}} из {{total}}, нужно {{quorum}}.', {
           present: present.length,
           total: participants.length,
           quorum: IC_RULES.quorum,
        });
   const dealOf = (item: AgendaItem) =>
      data.deals.find(({ id }) => id === item.dealId);
   // the dissenting opinions, with the member's comment
   const dissent = meeting.agenda.flatMap((item) =>
      participants
         .filter(({ id }) => item.votes[id]?.choice === 'dissent')
         .map((member) => ({
            key: `${item.id}/${member.id}`,
            text: [
               `${member.name}, ${item.title}`,
               item.votes[member.id].note,
            ]
               .filter(Boolean)
               .join(': '),
         })),
   );

   // the sheet as plain text, for a letter or a document
   const copy = async () => {
      const names =
         present.map((member) => memberLine(t, member)).join('; ') || '—';
      const heads = `${t('Председательствующий')}: ${chair?.name ?? '—'}.`;
      const lines = [
         number.toUpperCase(),
         of,
         `${t('г. Ташкент')}, ${date}`,
         '',
         `${t('Присутствовали')}: ${names}`,
         quorum,
         `${heads} ${t('Секретарь')}: ${secretary}.`,
         '',
         `${t('Повестка дня')}:`,
         ...meeting.agenda.map(
            (item, index) => `${index + 1}. ${agendaLine(t, item)}`,
         ),
         ...meeting.agenda.flatMap((item, index) => [
            '',
            t('По вопросу {{index}}', { index: index + 1 }),
            ...PROTOCOL_FIELDS.filter(({ key }) => item.protocol[key]).map(
               ({ key, label }) => `${t(label)}: ${item.protocol[key]}`,
            ),
            ...(item.kind === 'decision'
               ? [`${t('Голосовали')}: ${votesLine(t, meeting, data, item)}`]
               : []),
            `${t('Решили')}: ${decisionLine(t, item)}.`,
         ]),
         ...(dissent.length
            ? ['', `${t('Особые мнения')}:`, ...dissent.map(({ text }) => text)]
            : []),
      ];
      try {
         await navigator.clipboard.writeText(lines.join('\n'));
         toast.success(t('Текст протокола скопирован'));
      } catch {
         toast.error(t('Не удалось скопировать текст'));
      }
   };

   return (
      <>
         <div className='print-hidden mb-3.5 flex flex-wrap items-center gap-2'>
            <Button
               hint={t('Скопировать весь текст протокола')}
               variant='ghost'
               onClick={copy}
            >
               <Copy aria-hidden />
               {t('Скопировать текст')}
            </Button>
            <Button
               hint={t('Открыть печать: протокол можно сохранить в PDF')}
               variant='ghost'
               onClick={() => window.print()}
            >
               <Printer aria-hidden />
               {t('Скачать протокол')}
            </Button>
            <span className='text-ink-faint min-w-0 flex-[1_1_16rem] text-xs'>
               {t(
                  'Протокол собирается из повестки, состава и голосования. Подписанный экземпляр отметьте кнопкой «Отметить протокол подписанным».',
               )}
            </span>
         </div>
         <article className='border-line shadow-card text-navy-deep mx-auto w-full max-w-205 rounded border bg-white px-5 py-7 text-sm leading-[1.65] sm:px-14 sm:py-12 print:border-0 print:p-0 print:shadow-none'>
            <h2 className='text-center text-base font-bold tracking-wide uppercase'>
               {number}
            </h2>
            <p className='mb-6 text-center'>{of}</p>
            <div className='mb-4.5 flex justify-between gap-3'>
               <span>{t('г. Ташкент')}</span>
               <span>{date}</span>
            </div>
            <p className={P}>
               <b>{t('Время и формат')}:</b>{' '}
               {[meeting.time, formatName(t, meeting.format)]
                  .filter(Boolean)
                  .join(', ')}
            </p>
            <p className={P}>
               <b>
                  {planned ? t('Подтвердили участие') : t('Присутствовали')}:
               </b>{' '}
               {present.map((member) => memberLine(t, member)).join('; ') ||
                  '—'}
               .
            </p>
            {absent.length > 0 && (
               <p className={P}>
                  <b>{t('Отсутствовали')}:</b>{' '}
                  {absent.map(({ name }) => name).join(', ')}.
               </p>
            )}
            <p className={P}>
               {quorum} {t('Председательствующий')}: {chair?.name ?? '—'}.{' '}
               {t('Секретарь')}: {secretary}.
            </p>
            <h3 className={H3}>{t('Повестка дня')}</h3>
            {meeting.agenda.length ? (
               meeting.agenda.map((item, index) => (
                  <p key={item.id} className={P}>
                     {index + 1}. {agendaLine(t, item)}.
                  </p>
               ))
            ) : (
               <p className={P}>{t('В повестке нет вопросов.')}</p>
            )}
            {meeting.agenda.map((item, index) => (
               <ProtocolItem
                  key={item.id}
                  data={data}
                  deal={dealOf(item)}
                  index={index + 1}
                  item={item}
                  meeting={meeting}
                  writable={writable}
               />
            ))}
            {dissent.length > 0 && (
               <>
                  <h3 className={H3}>{t('Особые мнения')}</h3>
                  {dissent.map(({ key, text }) => (
                     <p key={key} className={P}>
                        {text}
                     </p>
                  ))}
               </>
            )}
            <div className='mt-8 grid grid-cols-2 gap-x-8 gap-y-4.5'>
               {present.map((member) => (
                  <div
                     key={member.id}
                     className='border-line-strong text-ink-soft border-t pt-1 text-xs'
                  >
                     {member.name}
                  </div>
               ))}
               <div className='border-line-strong text-ink-soft border-t pt-1 text-xs'>
                  {t('Секретарь')}: {secretary}
               </div>
            </div>
         </article>
      </>
   );
};

interface ProtocolItemProps {
   data: CommitteeData;
   meeting: Meeting;
   item: AgendaItem;
   deal?: Deal;
   index: number;
   writable: boolean;
}

// One question of the protocol: who reported, the secretary's notes, the
// votes, the decision and what is attached.
const ProtocolItem = ({
   data,
   meeting,
   item,
   deal,
   index,
   writable,
}: ProtocolItemProps) => {
   const { t, i18n } = useTranslation('committee');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const saving = useAction(
      (key: (typeof PROTOCOL_FIELDS)[number]['key'], value: string) =>
         committee.setProtocol(meeting.id, item.id, key, value),
      { success: t('Протокол сохранён') },
   );
   const files = useAttachments({
      section: 'committee',
      itemId: item.id,
      dealId: item.dealId,
   });
   const records = useAttachments({
      section: 'committee_record',
      itemId: item.id,
      dealId: item.dealId,
   });
   const attached = [...files, ...records];
   const speaker = personName(speakerOf(item, deal));
   const about = deal
      ? [
           industryText(deal),
           roundText(deal),
           (item.amount || deal.amount) &&
              t('запрос {{amount}}', {
                 amount: formatUsd(item.amount || deal.amount, language),
              }),
        ]
           .filter(Boolean)
           .join(', ')
      : '';
   const line = (label: string, value: ReactNode) => (
      <p className={P}>
         <b>{label}:</b> {value}
      </p>
   );

   return (
      <>
         <h3 className={H3}>{t('По вопросу {{index}}', { index })}</h3>
         {item.kind === 'decision' &&
            line(
               t('Слушали'),
               [
                  speaker || t('докладчик не назначен'),
                  t('о сделке {{company}}', { company: item.title }),
               ].join(' — ') + (about ? ` (${about}).` : '.'),
            )}
         {PROTOCOL_FIELDS.map(({ key, label }) =>
            writable ? (
               <label key={key} className='mb-2.5 block'>
                  <b>{t(label)}:</b>
                  <textarea
                     className='field-input text-meta mt-1 field-sizing-content min-h-14 w-full resize-none'
                     defaultValue={item.protocol[key]}
                     onBlur={(event) => {
                        if (event.target.value !== item.protocol[key])
                           saving.run(key, event.target.value);
                     }}
                  />
               </label>
            ) : (
               item.protocol[key] && (
                  <p key={key} className={P}>
                     <b>{t(label)}:</b> {item.protocol[key]}
                  </p>
               )
            ),
         )}
         {item.kind === 'decision' &&
            line(t('Голосовали'), votesLine(t, meeting, data, item))}
         {line(t('Решили'), `${decisionLine(t, item)}.`)}
         {attached.length > 0 && (
            <p className='text-ink-soft mb-2 text-xs'>
               {t('Приложения')}:{' '}
               {attached.map(({ title }) => title).join(', ')}
            </p>
         )}
      </>
   );
};

export default Protocol;
