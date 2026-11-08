import { createRow, deleteRow, listRows, num, type Row, str, updateRow } from '@shared/api/ucode';
import { createStore, newId } from '@shared/helpers';
import { useServiceData } from '@shared/hooks';
import {
   NEWS_SOURCE_KINDS,
   type NewsSource,
   type NewsSourceKind,
} from '@shared/types/site.types';

/* The news collector of the website (docs/news.md, batch 28), as Настройки →
   Сбор новостей shows it: the sources (`news_sources`) and its settings and
   state in `fund_settings` (`news_*`). The bot's server (venture/telegram-bot,
   src/news) reads them every minute and writes the articles it keeps into the
   website's `news` table as drafts, which Сайт → Новости publishes. */

export interface CollectorState {
   ready: boolean; // batch 28 exists
   running: boolean; // the server wrote in the last three minutes
   seenAt: string;
   checkedAt: string; // its last round
   asking: boolean; // «Проверить сейчас» not answered yet
   ai: string; // Claude's model, '' without a key
   aiError: string;
   settingsId: string;
   names: string; // the fund's names, one per line
   focus: string; // for Claude
   every: number; // minutes between a source's checks
   sources: NewsSource[];
}

export const DEFAULT_NAMES = 'SQB Ventures\nSQBVC\nSQB VC\nСКБ Венчурс';
export const DEFAULT_FOCUS =
   'Венчурные инвестиции и стартапы Узбекистана и Центральной Азии: раунды, фонды, акселераторы, IT Park, регулирование; FinTech, B2B SaaS, AI.';
export const DEFAULT_EVERY = 30;

const STALE_MS = 3 * 60_000;
const flag = (value: unknown) => value === true || value === 'true';

const toSource = (row: Row): NewsSource => ({
   id: row.guid,
   name: str(row.name),
   kind: NEWS_SOURCE_KINDS.find((kind) => kind === row.kind) ?? 'rss',
   address: str(row.address),
   keywords: str(row.keywords),
   mentionsOnly: flag(row.mentions_only),
   autoPublish: flag(row.auto_publish),
   active: flag(row.is_active),
   checkedAt: str(row.checked_at),
   foundCount: num(row.found_count),
   error: str(row.error),
});

const store = createStore(async (): Promise<CollectorState> => {
   const [settings, sources] = await Promise.all([
      listRows('fund_settings').catch(() => [] as Row[]),
      listRows('news_sources').then(
         (rows) => rows,
         () => null,
      ),
   ]);
   const row = settings[0] ?? ({ guid: '' } as Row);
   const seenAt = str(row.news_seen_at);
   const checkedAt = str(row.news_checked_at);
   const requested = str(row.news_requested_at);
   return {
      ready: sources !== null,
      running: !!seenAt && Date.now() - new Date(seenAt).getTime() < STALE_MS,
      seenAt,
      checkedAt,
      asking: !!requested && requested > checkedAt,
      ai: str(row.news_ai),
      aiError: str(row.news_error),
      settingsId: row.guid,
      names: str(row.news_names),
      focus: str(row.news_focus),
      every: num(row.news_every) || DEFAULT_EVERY,
      sources: (sources ?? [])
         .map(toSource)
         .sort((a, b) => a.name.localeCompare(b.name)),
   };
});

const sourceRow = (source: NewsSource) => ({
   name: source.name.trim(),
   kind: source.kind,
   address: source.address.trim(),
   keywords: source.keywords.trim(),
   mentions_only: source.mentionsOnly,
   auto_publish: source.autoPublish,
   is_active: source.active,
});

/* Sources to start with (tried on 8 Nov 2026): the outlets' own feeds, whose
   articles come with their text and pictures, picked by startup keywords;
   and the fund named in Google News, for «Пресса о нас» (Google gives a
   title and a link only, so it is kept for mentions). */
const STARTUP_RU = 'стартап, венчур, инвест, раунд, финтех, IT Park, акселератор, хакатон';
export const STARTER_SOURCES: Omit<NewsSource, 'id' | 'checkedAt' | 'foundCount' | 'error'>[] = [
   {
      name: 'Spot.uz',
      kind: 'rss',
      address: 'https://www.spot.uz/ru/rss/',
      keywords: STARTUP_RU,
      mentionsOnly: false,
      autoPublish: false,
      active: true,
   },
   {
      name: 'Gazeta.uz',
      kind: 'rss',
      address: 'https://www.gazeta.uz/ru/rss/',
      keywords: STARTUP_RU,
      mentionsOnly: false,
      autoPublish: false,
      active: true,
   },
   {
      name: 'Kun.uz',
      kind: 'rss',
      address: 'https://kun.uz/news/rss',
      keywords: 'startap, venchur, investitsiya, IT Park, akselerator, xakaton, стартап, венчур',
      mentionsOnly: false,
      autoPublish: false,
      active: true,
   },
   {
      name: 'UzDaily',
      kind: 'site',
      address: 'https://www.uzdaily.uz',
      keywords: STARTUP_RU,
      mentionsOnly: false,
      autoPublish: false,
      active: true,
   },
   {
      name: 'Google News: SQB Ventures',
      kind: 'google',
      address: '"SQB Ventures"',
      keywords: '',
      mentionsOnly: true,
      autoPublish: false,
      active: true,
   },
];

const collector = {
   subscribe: (listener: () => void) => store.subscribe(listener),
   getState: () => store.get(),
   reload: () => store.reload(),

   newSource(kind: NewsSourceKind = 'rss'): NewsSource {
      return {
         id: '',
         name: '',
         kind,
         address: '',
         keywords: '',
         mentionsOnly: false,
         autoPublish: false,
         active: true,
         checkedAt: '',
         foundCount: 0,
         error: '',
      };
   },

   async saveSource(source: NewsSource) {
      if (source.id) await updateRow('news_sources', { guid: source.id, ...sourceRow(source) });
      // a new source is checked on the server's next minute (no checked_at)
      else await createRow('news_sources', { guid: newId(), ...sourceRow(source), found_count: 0 });
      await store.reload();
   },

   async setSource(id: string, fields: Partial<Pick<NewsSource, 'active' | 'autoPublish'>>) {
      await updateRow('news_sources', {
         guid: id,
         ...('active' in fields && { is_active: fields.active }),
         ...('autoPublish' in fields && { auto_publish: fields.autoPublish }),
      });
      await store.reload();
   },

   async removeSource(id: string) {
      await deleteRow('news_sources', id);
      await store.reload();
   },

   // The starter sources the fund does not have yet.
   async addStarters() {
      const { sources } = await store.get();
      const have = new Set(sources.map(({ address }) => address.trim().toLowerCase()));
      for (const source of STARTER_SOURCES)
         if (!have.has(source.address.toLowerCase()))
            await createRow('news_sources', {
               guid: newId(),
               ...sourceRow({ ...source, id: '', checkedAt: '', foundCount: 0, error: '' }),
               found_count: 0,
            });
      await store.reload();
   },

   // One source on the server's next minute: an empty checked_at is due.
   async checkSource(id: string) {
      await updateRow('news_sources', { guid: id, checked_at: null, error: '' });
      await store.reload();
   },

   // Every source switched on, on the server's next minute.
   async checkAll() {
      const { settingsId } = await store.get();
      if (!settingsId) throw new Error('fund_settings has no row');
      await updateRow('fund_settings', {
         guid: settingsId,
         news_requested_at: new Date().toISOString(),
      });
      await store.reload();
   },

   // The fund's names and its focus for Claude («Отбор»).
   async saveSettings(values: { names: string; focus: string }) {
      const { settingsId } = await store.get();
      if (!settingsId) throw new Error('fund_settings has no row');
      await updateRow('fund_settings', {
         guid: settingsId,
         news_names: values.names.trim(),
         news_focus: values.focus.trim(),
      });
      await store.reload();
   },

   // How often each source is checked, in minutes.
   async setEvery(every: number) {
      const { settingsId } = await store.get();
      if (!settingsId) throw new Error('fund_settings has no row');
      await updateRow('fund_settings', { guid: settingsId, news_every: every });
      await store.reload();
   },
};

const load = () => collector.getState();
const watch = (listener: () => void) => collector.subscribe(listener);

// The collector for a page; null until first read.
export const useCollector = () => useServiceData(load, watch);

export default collector;
