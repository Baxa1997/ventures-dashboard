import { createRow, listRows, str, updateRow } from '@shared/api/ucode';
import { createStore } from '@shared/helpers';
import { useServiceData } from '@shared/hooks';

/* The deals' Telegram groups and the bot's state, as the bot's server
   (venture/telegram-bot) writes them in ucode (batch 26): `tg_chats` and the
   `telegram_*` fields of `fund_settings`. The panel reads them, asks for a
   group by a `tg_chats` row with `status` `requested`, and links the fund's
   account by writing the steps to `telegram_auth`: the server answers with a
   QR code the fund's phone scans in Telegram (Settings → Devices → Link
   Desktop Device), then asks for the two-step password if the account has
   one, which is encrypted here with the server's public key
   (`telegram_keys`), so only the server reads it. */

export type TgGroupStatus =
   | 'requested' // the panel asked; the bot's server takes it up
   | 'creating' // the fund's account is making it
   | 'waiting_bot' // a person adds the bot by the link
   | 'active'
   | 'lost' // the bot was removed from the group
   | 'failed';

export interface TgGroup {
   id: string;
   dealId: string;
   status: TgGroupStatus;
   title: string;
   inviteLink: string;
   linkToken: string;
   error: string;
}

// Linking the fund's account, step by step (venture/telegram-bot, account.ts).
export type AuthStep =
   | 'idle'
   | 'qr_start' // the panel asks for a QR code
   | 'qr_waiting' // the server prepares it
   | 'qr' // shown: the phone scans it; a new one every ~30 s
   | 'password_needed'
   | 'password' // the panel sent the two-step password
   | 'password_checking'
   | 'done'
   | 'error'
   | 'cancel'
   | 'logout';

export interface TelegramState {
   connected: boolean; // the bot's server ran in the last three minutes
   bot: string; // its bot's username, without @
   mode: 'account' | 'link' | ''; // whether the fund's account creates groups
   seenAt: string; // ISO: when the server last wrote
   groups: Map<string, TgGroup>; // by deal
   settingsId: string; // the fund_settings row
   publicKey: string; // the server's, base64 SPKI: '' until it first ran
   app: boolean; // our Telegram app's keys are set on the server: the QR works
   auth: { step: AuthStep; qr: string; hint: string; error: string };
   account: { phone: string; connectedAt: string } | null; // connected from the panel
}

const STALE_MS = 3 * 60_000;

// The rights the bot asks for when a person adds it to a group by the link.
const BOT_RIGHTS =
   'change_info+delete_messages+restrict_members+invite_users+pin_messages+manage_chat';

const toGroup = (row: Record<string, unknown> & { guid: string }): TgGroup => ({
   id: row.guid,
   dealId: str(row.deals_id),
   status: (str(row.status) || 'requested') as TgGroupStatus,
   title: str(row.title),
   inviteLink: str(row.invite_link),
   linkToken: str(row.link_token),
   error: str(row.error),
});

const json = <T>(value: unknown, fallback: T): T => {
   if (!value) return fallback;
   if (typeof value !== 'string') return value as T;
   try {
      return JSON.parse(value) as T;
   } catch {
      return fallback;
   }
};

// a project without batch 26 reads as Telegram not connected
const optional = <T>(load: Promise<T[]>) => load.catch(() => [] as T[]);

type SettingsRow = Awaited<ReturnType<typeof listRows>>[number];

// What fund_settings says: the bot, its server, the account, a sign-in under way.
const fromSettings = (row: SettingsRow): Omit<TelegramState, 'groups'> => {
   const seenAt = str(row.telegram_seen_at);
   const auth = json<Partial<TelegramState['auth']> & { step?: AuthStep }>(
      row.telegram_auth,
      {},
   );
   const account = json<{ phone?: string; connectedAt?: string }>(
      row.telegram_account,
      {},
   );
   return {
      connected: !!seenAt && Date.now() - new Date(seenAt).getTime() < STALE_MS,
      bot: str(row.telegram_bot),
      mode:
         (['account', 'link'] as const).find(
            (mode) => mode === row.telegram_mode,
         ) ?? '',
      seenAt,
      settingsId: str(row.guid),
      publicKey: json<{ public?: string }>(row.telegram_keys, {}).public ?? '',
      app: json<{ app?: boolean }>(row.telegram_keys, {}).app === true,
      auth: {
         step: auth.step ?? 'idle',
         qr: auth.qr ?? '',
         hint: auth.hint ?? '',
         error: auth.error ?? '',
      },
      account: account.phone
         ? { phone: account.phone, connectedAt: account.connectedAt ?? '' }
         : null,
   };
};

const store = createStore(async (): Promise<TelegramState> => {
   const [settings, chats] = await Promise.all([
      optional(listRows('fund_settings')),
      optional(listRows('tg_chats')),
   ]);
   return {
      ...fromSettings(settings[0] ?? { guid: '' }),
      groups: new Map(
         chats
            .map(toGroup)
            .filter(({ dealId }) => dealId)
            .map((group) => [group.dealId, group]),
      ),
   };
});

// A secret for the server only: RSA-OAEP with SHA-256 under its public key.
const encrypt = async (publicKey: string, text: string) => {
   const key = await crypto.subtle.importKey(
      'spki',
      Uint8Array.from(atob(publicKey), (char) => char.charCodeAt(0)),
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['encrypt'],
   );
   const sealed = await crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      key,
      new TextEncoder().encode(text),
   );
   return btoa(String.fromCharCode(...new Uint8Array(sealed)));
};

// Writes the next step of the sign-in for the server to take up.
const writeAuth = async (step: Record<string, unknown>) => {
   const { settingsId } = await store.get();
   if (!settingsId) throw new Error('fund_settings has no row');
   await updateRow('fund_settings', {
      guid: settingsId,
      telegram_auth: JSON.stringify({ ...step, at: new Date().toISOString() }),
   });
   await store.reload();
};

const telegram = {
   subscribe: (listener: () => void) => store.subscribe(listener),
   getState: () => store.get(),
   reload: () => store.reload(),

   // Only fund_settings, without the groups: what the QR window waits for
   // (a new code, the server's answer), one read at a time.
   reloadAuth: async () => {
      const [settings] = await Promise.all([
         optional(listRows('fund_settings')),
         store.get(),
      ]);
      store.set((state) => ({ ...state, ...fromSettings(settings[0] ?? { guid: '' }) }));
   },

   // The link that adds the bot to a group of the person's, for that deal.
   linkOf: (state: TelegramState, group: TgGroup) =>
      state.bot && group.linkToken
         ? `https://t.me/${state.bot}?startgroup=${group.linkToken}&admin=${BOT_RIGHTS}`
         : '',

   /* Asks for the deal's group: a new row, or the deal's row again after the
      bot lost its group or could not make it. */
   async requestGroup(dealId: string, title: string, userId: string) {
      await this.requestGroups([{ dealId, title }], userId);
   },

   // The same for several deals at once (Настройки → Интеграции).
   async requestGroups(deals: { dealId: string; title: string }[], userId: string) {
      const { groups } = await store.get();
      for (const { dealId, title } of deals) {
         const group = groups.get(dealId);
         if (group)
            await updateRow('tg_chats', {
               guid: group.id,
               status: 'requested',
               requested_by_id: userId,
               error: '',
            });
         else
            await createRow('tg_chats', {
               deals_id: dealId,
               title,
               status: 'requested',
               requested_by_id: userId,
            });
      }
      await store.reload();
   },

   // ---- linking the fund's account

   startQr: () => writeAuth({ step: 'qr_start' }),

   async sendPassword(password: string) {
      const { publicKey } = await store.get();
      await writeAuth({ step: 'password', password: await encrypt(publicKey, password) });
   },

   cancelLogin: () => writeAuth({ step: 'cancel' }),

   logout: () => writeAuth({ step: 'logout' }),
};

const load = () => telegram.getState();
const watch = (listener: () => void) => telegram.subscribe(listener);

// The state for a page; null until first read.
export const useTelegram = () => useServiceData(load, watch);

export default telegram;
