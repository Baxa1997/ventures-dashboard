import { createStore, newId, todayISO } from '@shared/helpers';
import type {
   ControlItem,
   Letter,
   LetterStatus,
   NewLetterInput,
   RegularSend,
} from '@shared/types/correspondence.types';
import { SAMPLE_CONTROL, SAMPLE_LETTERS, SAMPLE_SENDS } from './sample';

export interface CorrespondenceState {
   letters: Letter[];
   sends: RegularSend[];
   control: ControlItem[];
}

const store = createStore<CorrespondenceState>(
   'sqbv_dashboard_correspondence_v1',
   () => ({
      letters: SAMPLE_LETTERS,
      sends: SAMPLE_SENDS,
      control: SAMPLE_CONTROL,
   }),
);

// The letters where the next move is the fund's.
export const FUND_TURN: LetterStatus[] = [
   'signing',
   'awaiting_fund',
   'in_work',
];

const changeLetter = (id: string, patch: Partial<Letter>) =>
   store.update((state) => ({
      ...state,
      letters: state.letters.map((letter) =>
         letter.id === id ? { ...letter, ...patch } : letter,
      ),
   }));

class Correspondence {
   subscribe(listener: () => void) {
      return store.subscribe(listener);
   }

   async getState(): Promise<CorrespondenceState> {
      return store.read();
   }

   // An incoming letter is registered; an outgoing one starts as a draft.
   async createLetter(input: NewLetterInput): Promise<Letter> {
      const incoming = input.direction === 'in';
      const letter: Letter = {
         id: newId(),
         direction: input.direction,
         number: input.number || null,
         date: incoming ? todayISO() : null,
         due: incoming ? null : input.replyDue || null,
         party: input.party,
         subject: input.subject,
         link: { kind: 'regulation', label: '—' },
         status: incoming ? 'awaiting_fund' : 'signing',
         ownerId: input.ownerId,
         replyDue: incoming ? input.replyDue || null : null,
      };
      store.update((state) => ({
         ...state,
         letters: [letter, ...state.letters],
      }));
      return letter;
   }

   async takeInWork(id: string) {
      changeLetter(id, { status: 'in_work' });
   }

   // The director signed the draft; it goes out with its number today.
   async send(id: string, number: string) {
      const letter = store.read().letters.find((item) => item.id === id);
      // a report under the regulation needs no answer
      changeLetter(id, {
         number,
         date: todayISO(),
         due: null,
         status:
            letter?.link.kind === 'regulation' ? 'closed' : 'awaiting_reply',
      });
      if (letter?.link.kind === 'regulation')
         store.update((state) => ({
            ...state,
            sends: state.sends.map((send) =>
               send.status === 'in_work' && letter.due?.startsWith(send.month)
                  ? {
                       ...send,
                       status: 'sent',
                       letter: `${number} от ${todayISO().split('-').reverse().join('.')}`,
                    }
                  : send,
            ),
         }));
   }

   async close(id: string) {
      changeLetter(id, { status: 'closed' });
   }
}

export default new Correspondence();
