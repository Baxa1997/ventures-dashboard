import { useSyncExternalStore } from 'react';

/* What a person has read in «Чат и письма», kept in this browser, as the
   bell keeps the notices seen: per group, the moment of the last message
   they saw, and the groups they marked unread. Messages from before the
   first visit count as read, so the counters start at nothing. */

export interface ChatReadState {
   since: string; // ISO: the first visit
   seen: Record<string, string>; // deal id → the last message's moment seen
   unread: string[]; // deal ids marked unread by hand
}

const keyOf = (userId: string) => `sqbv_chat_read_${userId}`;
const states = new Map<string, ChatReadState>();
const listeners = new Set<() => void>();

const read = (userId: string): ChatReadState => {
   const known = states.get(userId);
   if (known) return known;
   let state: ChatReadState | null = null;
   try {
      state = JSON.parse(localStorage.getItem(keyOf(userId)) ?? 'null');
   } catch {
      state = null;
   }
   if (!state?.since) {
      state = { since: new Date().toISOString(), seen: {}, unread: [] };
      write(userId, state, false);
   }
   states.set(userId, state);
   return state;
};

function write(userId: string, state: ChatReadState, announce = true) {
   states.set(userId, state);
   try {
      localStorage.setItem(keyOf(userId), JSON.stringify(state));
   } catch {
      // storage unavailable: what was read comes back as unread after a reload
   }
   if (announce) listeners.forEach((listener) => listener());
}

const chatRead = {
   get: read,

   subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
         listeners.delete(listener);
      };
   },

   // The group's messages up to `at` are read; it is no longer marked unread.
   markRead(userId: string, dealId: string, at: string) {
      const state = read(userId);
      if (state.seen[dealId] === at && !state.unread.includes(dealId)) return;
      write(userId, {
         ...state,
         seen: { ...state.seen, [dealId]: at },
         unread: state.unread.filter((id) => id !== dealId),
      });
   },

   markUnread(userId: string, dealId: string) {
      const state = read(userId);
      if (state.unread.includes(dealId)) return;
      write(userId, { ...state, unread: [...state.unread, dealId] });
   },
};

// The person's read state, kept in step with every change.
export const useChatRead = (userId: string) =>
   useSyncExternalStore(chatRead.subscribe, () => read(userId));

export default chatRead;
