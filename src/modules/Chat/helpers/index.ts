import { teamOf } from '@modules/Deals/helpers';
import { DATE_FORMAT, employeeOf } from '@shared/constants';
import type { Attachment } from '@shared/types/attachments.types';
import type { Deal, JournalEntry } from '@shared/types/deals.types';
import dayjs from 'dayjs';
import type { TFunction } from 'i18next';
import type { ChatReadState } from '../services/read';
import type { TgGroup } from '../services/telegram';

/* «Чат и письма»: every deal has its group, «Сделка: …», opened with the
   deal. Its messages are the deal journal's `message` lines (the same chat as
   «Чат команды» on the deal's card), with their files in the attachments
   table (section `chat`). Once the fund's Telegram account is wired in, each
   new deal's group opens in Telegram too and its messages come here
   (docs/telegram.md). */

// Where a chat comes from: the letter on its avatar and its colour, as the
// prototype marks them.
export const CHANNELS = {
   deal: { letter: 'Д', color: '#B5487A' },
   telegram: { letter: 'T', color: '#2AABEE' },
} as const;

export type ChatChannel = keyof typeof CHANNELS;

// The filters above the list: every group, or those with unread messages.
export type ChatFilter = 'all' | 'unread';

const AVATAR_COLORS = [
   '#5764CA',
   '#407CEA',
   '#1E9BB8',
   '#1F9D6B',
   '#C98A12',
   '#262F70',
   '#B5487A',
];

// A name's own colour, the same wherever it is drawn.
export const colorOf = (name: string) => {
   let hash = 0;
   for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % 997;
   return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

export interface ChatMessage {
   id: string;
   // a message; the group opened by a person; the group opened by an
   // application from the website
   kind: 'message' | 'created' | 'site';
   userId: string; // the employee who wrote it, '' for the website or Telegram
   author: string; // the Telegram name of one written in Telegram, else ''
   tgState: 'pending' | 'sent' | 'failed' | ''; // the panel's, on its way there
   text: string;
   at: string; // the moment, ISO
   date: string; // YYYY-MM-DD, local
   files: Attachment[];
}

export interface Chat {
   deal: Deal;
   messages: ChatMessage[]; // oldest first; the opening line at least
   last: ChatMessage;
   unread: number; // others' messages since the person last read it
   telegram: boolean; // its Telegram group is open, with the bot in it
   group: TgGroup | null; // its Telegram group in any state, or none yet
}

const momentOf = (entry: Pick<JournalEntry, 'at' | 'date'>) =>
   entry.at ?? `${entry.date}T00:00:00`;

const timeOf = (at: string) => dayjs(at).valueOf();

// The group's lines, oldest first: its opening and its messages.
export const messagesOf = (deal: Deal, files: Attachment[]): ChatMessage[] => {
   const lines = deal.journal.flatMap((entry): ChatMessage[] => {
      const at = momentOf(entry);
      const base = { id: entry.id, at, date: dayjs(at).format(DATE_FORMAT) };
      if (entry.kind === 'message')
         return [
            {
               ...base,
               kind: 'message',
               userId: entry.userId,
               author: entry.source === 'telegram' ? entry.author || 'Telegram' : '',
               tgState: entry.tgState ?? '',
               text: entry.text,
               files: files.filter(
                  (file) => file.section === 'chat' && file.itemId === entry.id,
               ),
            },
         ];
      if (entry.kind === 'created')
         return [
            {
               ...base,
               kind: entry.userId ? 'created' : 'site',
               userId: entry.userId,
               author: '',
               tgState: '',
               text: '',
               files: [],
            },
         ];
      return [];
   });
   // a deal without its first line opened the day it came in
   if (!lines.some(({ kind }) => kind !== 'message')) {
      const received = deal.receivedAt
         ? dayjs(deal.receivedAt).toISOString()
         : (lines[0]?.at ?? new Date().toISOString());
      lines.push({
         id: `${deal.id}:opened`,
         kind: 'site',
         userId: '',
         author: '',
         tgState: '',
         text: '',
         at: received,
         date: dayjs(received).format(DATE_FORMAT),
         files: [],
      });
   }
   return lines.sort((a, b) => timeOf(a.at) - timeOf(b.at));
};

// How many of others' messages the person has not read yet.
const unreadOf = (
   dealId: string,
   messages: ChatMessage[],
   userId: string,
   read: ChatReadState,
) => {
   const seen = timeOf(read.seen[dealId] ?? read.since);
   const count = messages.filter(
      (message) =>
         message.kind === 'message' &&
         message.userId !== userId &&
         timeOf(message.at) > seen,
   ).length;
   return read.unread.includes(dealId) ? Math.max(1, count) : count;
};

// Every deal's group, the latest conversation first.
export const chatsOf = (
   deals: Deal[],
   files: Attachment[],
   userId: string,
   read: ChatReadState,
   groups: Map<string, TgGroup> = new Map(),
): Chat[] =>
   deals
      .map((deal) => {
         const messages = messagesOf(deal, files);
         const group = groups.get(deal.id) ?? null;
         return {
            deal,
            messages,
            last: messages[messages.length - 1],
            unread: unreadOf(deal.id, messages, userId, read),
            telegram: group?.status === 'active',
            group,
         };
      })
      .sort((a, b) => timeOf(b.last.at) - timeOf(a.last.at));

/* Whether a deal's chat is listed in «Чат и письма»: only the deals whose
   Telegram group exists (open, or the bot removed from it since), at the
   user's word (7 Nov). */
export const hasGroup = (group: TgGroup | null | undefined) =>
   group?.status === 'active' || group?.status === 'lost';

// The sidebar's figure: the groups with messages not read yet.
export const unreadChats = (
   deals: Deal[],
   userId: string,
   read: ChatReadState,
) =>
   deals.filter(
      (deal) => unreadOf(deal.id, messagesOf(deal, []), userId, read) > 0,
   ).length;

export interface ChatMember {
   id: string; // the employee
   roles: string[]; // what they do on the deal; none for those who only wrote
}

/* Who is in the group: the deal's team as its card lists it (the owner, the
   memorandum's sponsor, the second reviewer of the screening and the people
   the owner added), then anyone else of the fund who wrote in it. */
export const membersOf = (
   t: TFunction<'deals'>,
   deal: Deal,
   messages: ChatMessage[],
): ChatMember[] => {
   const members = new Map<string, string[]>();
   for (const { employeeId, role } of teamOf(t, deal))
      if (employeeId && employeeOf(employeeId))
         members.set(employeeId, [...(members.get(employeeId) ?? []), role]);
   for (const { userId } of messages)
      if (userId && employeeOf(userId) && !members.has(userId))
         members.set(userId, []);
   return [...members].map(([id, roles]) => ({ id, roles }));
};

// An employee's full name, or '' for an unknown id.
export const fullName = (id: string) => employeeOf(id)?.name ?? '';
