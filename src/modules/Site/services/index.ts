import {
   createRow,
   day,
   deleteRow,
   listRows,
   num,
   type Row,
   str,
   updateRow,
   uploadFile,
} from '@shared/api/ucode';
import { createStore, newId, todayISO } from '@shared/helpers';
import type {
   Localized,
   PartnerRequest,
   PartnerStatus,
   SiteCategory,
   SiteCompany,
   SiteContacts,
   SiteLanguage,
   SiteLegal,
   SiteNews,
   SiteSource,
   SiteSourceKind,
} from '@shared/types/site.types';
import {
   SITE_FILES_FOLDER,
   SITE_TABLES,
   type SiteTableId,
   type SiteTableInfo,
} from '../constants';

/* «Сайт» in ucode (docs/ucode-migration.md, batches 19 and 20): the tables the
   website reads on every visit, so what is saved here is on its next refresh. */

export const SITE_URL = (
   import.meta.env.VITE_SITE_URL ??
   (import.meta.env.DEV ? 'http://localhost:3001' : 'https://sqbvc.uz')
).replace(/\/+$/, '');

const flag = (value: unknown) => value !== false && value !== 'false';
export const localized = (row: Row, slug: string): Localized => ({
   ru: str(row[`${slug}_ru`]),
   uz: str(row[`${slug}_uz`]),
   en: str(row[`${slug}_en`]),
});
export const localizedRow = (slug: string, value: Localized) => ({
   [`${slug}_ru`]: value.ru,
   [`${slug}_uz`]: value.uz,
   [`${slug}_en`]: value.en,
});
const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order;

const toNews = (row: Row): SiteNews => ({
   id: row.guid,
   slug: str(row.slug),
   date: day(row.date),
   category: (str(row.category) || 'Fund') as SiteCategory,
   outlet: str(row.outlet),
   url: str(row.url),
   image: str(row.image),
   published: flag(row.is_published),
   title: localized(row, 'title'),
   excerpt: localized(row, 'excerpt'),
   body: localized(row, 'body'),
});

const toLegal = (row: Row): SiteLegal => ({
   id: row.guid,
   slug: str(row.slug),
   published: flag(row.is_published),
   title: localized(row, 'title'),
   body: localized(row, 'body'),
});

const toSource = (row: Row): SiteSource => ({
   id: row.guid,
   kind: str(row.kind) === 'report' ? 'report' : 'media',
   name: str(row.name),
   url: str(row.url),
   text: localized(row, 'text'),
   order: num(row.sort_order),
   visible: flag(row.is_visible),
});

const toCompany = (row: Row): SiteCompany => ({
   id: row.guid,
   name: str(row.name),
   industry: str(row.industry),
   stage: str(row.stage),
   status: str(row.status) === 'exit' ? 'exit' : 'active',
   city: str(row.city),
   country: str(row.country),
   invested: num(row.invested),
   year: str(row.year),
   website: str(row.website),
   founder: str(row.founder),
   founderRole: str(row.founder_role),
   founderLinkedin: str(row.founder_linkedin),
   order: num(row.sort_order),
   visible: flag(row.is_visible),
   tagline: localized(row, 'tagline'),
   quote: localized(row, 'quote'),
});

const toContacts = (row: Row | undefined): SiteContacts => ({
   id: row?.guid ?? '',
   email: str(row?.email),
   phone: str(row?.phone),
   mapUrl: str(row?.map_url),
   telegram: str(row?.telegram),
   linkedin: str(row?.linkedin),
   instagram: str(row?.instagram),
   address: row ? localized(row, 'address') : { ru: '', uz: '', en: '' },
   hours: row ? localized(row, 'hours') : { ru: '', uz: '', en: '' },
   foundersVideo: str(row?.founders_video),
   investorsVideo: str(row?.investors_video),
   logo: str(row?.logo),
   logoWhite: str(row?.logo_white),
});

const toPartner = (row: Row): PartnerRequest => ({
   id: row.guid,
   name: str(row.name),
   email: str(row.email),
   phone: str(row.phone),
   country: str(row.country),
   request: str(row.request),
   locale: str(row.locale),
   submittedAt: str(row.submitted_at),
   status: (str(row.status) || 'new') as PartnerStatus,
   ownerId: str(row.owner_id),
   note: str(row.note),
});

// What the state holds, each from its table; after a change only that table is read again.
const READS = {
   news: {
      table: 'news',
      parse: (rows: Row[]) =>
         rows.map(toNews).sort((a, b) => b.date.localeCompare(a.date)),
   },
   legal: { table: 'pages', parse: (rows: Row[]) => rows.map(toLegal) },
   sources: {
      table: 'site_sources',
      parse: (rows: Row[]) => rows.map(toSource).sort(byOrder),
   },
   companies: {
      table: 'portfolio',
      parse: (rows: Row[]) => rows.map(toCompany).sort(byOrder),
   },
   contacts: {
      table: 'site_settings',
      parse: (rows: Row[]) => toContacts(rows[0]),
   },
   partners: {
      table: 'partner_requests',
      parse: (rows: Row[]) =>
         rows
            .map(toPartner)
            .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
   },
} as const;

type Kind = keyof typeof READS;

const TABLE_IDS = Object.keys(SITE_TABLES) as SiteTableId[];
const inOrder = (rows: Row[]) =>
   [...rows].sort((a, b) => num(a.sort_order) - num(b.sort_order));

export type SiteState = {
   stored: boolean; // batches 19 and 20 have made the tables
   tables: Record<SiteTableId, Row[]>; // one for each array of the website's code
} & { [K in Kind]: ReturnType<(typeof READS)[K]['parse']> };

const store = createStore<SiteState>(async () => {
   const read = (table: string) => listRows(table).catch(() => null);
   const kinds = Object.keys(READS) as Kind[];
   const [own, tables] = await Promise.all([
      Promise.all(kinds.map((kind) => read(READS[kind].table))),
      Promise.all(TABLE_IDS.map((id) => read(SITE_TABLES[id].table))),
   ]);
   return {
      stored: [...own, ...tables].every(Boolean),
      tables: Object.fromEntries(
         TABLE_IDS.map((id, index) => [id, inOrder(tables[index] ?? [])]),
      ),
      ...Object.fromEntries(
         kinds.map((kind, index) => [
            kind,
            READS[kind].parse(own[index] ?? []),
         ]),
      ),
   } as SiteState;
});

// How many tables have no rows yet, of those the website's data can fill.
export const emptyTables = (state: SiteState) =>
   TABLE_IDS.filter((id) => !state.tables[id].length).length +
   [state.legal, state.sources, state.companies].filter((list) => !list.length)
      .length +
   (state.contacts.id ? 0 : 1);

const refresh = async (kind: Kind) => {
   const rows = await listRows(READS[kind].table);
   store.set((state) => ({ ...state, [kind]: READS[kind].parse(rows) }));
};

const refreshTable = async (id: SiteTableId) => {
   const rows = await listRows(SITE_TABLES[id].table);
   store.set((state) => ({
      ...state,
      tables: { ...state.tables, [id]: inOrder(rows) },
   }));
};

const newsRow = ({ id: _id, ...news }: SiteNews) => ({
   slug: news.slug,
   date: news.date,
   category: news.category,
   outlet: news.outlet,
   url: news.url,
   image: news.image,
   is_published: news.published,
   ...localizedRow('title', news.title),
   ...localizedRow('excerpt', news.excerpt),
   ...localizedRow('body', news.body),
});

const legalRow = ({ id: _id, ...page }: SiteLegal) => ({
   slug: page.slug,
   is_published: page.published,
   ...localizedRow('title', page.title),
   ...localizedRow('body', page.body),
});

const sourceRow = ({ id: _id, ...source }: SiteSource) => ({
   kind: source.kind,
   name: source.name,
   url: source.url,
   sort_order: source.order,
   is_visible: source.visible,
   ...localizedRow('text', source.text),
});

const companyRow = ({ id: _id, ...company }: SiteCompany) => ({
   name: company.name,
   industry: company.industry,
   stage: company.stage,
   status: company.status,
   city: company.city,
   country: company.country,
   invested: company.invested,
   year: company.year,
   website: company.website,
   founder: company.founder,
   founder_role: company.founderRole,
   founder_linkedin: company.founderLinkedin,
   sort_order: company.order,
   is_visible: company.visible,
   ...localizedRow('tagline', company.tagline),
   ...localizedRow('quote', company.quote),
});

// The tables whose rows are written and removed the same way.
const TABLES = {
   news: { table: 'news', row: newsRow },
   legal: { table: 'pages', row: legalRow },
   sources: { table: 'site_sources', row: sourceRow },
   companies: { table: 'portfolio', row: companyRow },
} as const;

type RecordKind = keyof typeof TABLES;

interface RecordOf {
   news: SiteNews;
   legal: SiteLegal;
   sources: SiteSource;
   companies: SiteCompany;
}

class Site {
   subscribe(listener: () => void) {
      return store.subscribe(listener);
   }

   getState() {
      return store.get();
   }

   // ---- the website's data, from the arrays of its code, into the tables with no rows
   async fill() {
      const { default: seed } = await import('../seed.json');
      for (const [table, rows] of Object.entries(seed) as [
         string,
         Record<string, unknown>[],
      ][]) {
         if ((await listRows(table)).length) continue;
         await Promise.all(
            rows.map((row) => createRow(table, { guid: newId(), ...row })),
         );
      }
      await store.reload();
   }

   pageUrl(path: string, language: SiteLanguage = 'ru') {
      return `${SITE_URL}/${language}${path === '/' ? '' : path}`;
   }

   // ---- rows of a list: a new one has no id
   async save<K extends RecordKind>(kind: K, record: RecordOf[K]) {
      const { table, row } = TABLES[kind] as unknown as {
         table: string;
         row: (value: RecordOf[K]) => Record<string, unknown>;
      };
      if (record.id)
         await updateRow(table, { guid: record.id, ...row(record) });
      else await createRow(table, { guid: newId(), ...row(record) });
      await refresh(kind);
   }

   async remove(kind: RecordKind, id: string) {
      await deleteRow(TABLES[kind].table, id);
      await refresh(kind);
   }

   async setShown(kind: RecordKind, id: string, shown: boolean) {
      const field =
         kind === 'news' || kind === 'legal' ? 'is_published' : 'is_visible';
      await updateRow(TABLES[kind].table, { guid: id, [field]: shown });
      await refresh(kind);
   }

   // A list in its new order: only the rows that moved are written.
   async reorder(
      kind: 'sources' | 'companies',
      list: { id: string; order: number }[],
   ) {
      await Promise.all(
         list.flatMap((item, index) =>
            item.order === index + 1
               ? []
               : [
                    updateRow(TABLES[kind].table, {
                       guid: item.id,
                       sort_order: index + 1,
                    }),
                 ],
         ),
      );
      await refresh(kind);
   }

   // ---- the rows of a table
   async saveRow(id: SiteTableId, row: Row) {
      const { table, fields, icon }: SiteTableInfo = SITE_TABLES[id];
      const values = Object.fromEntries(
         fields.flatMap((field) =>
            field.plain
               ? [[field.slug, str(row[field.slug])]]
               : Object.entries(
                    localizedRow(field.slug, localized(row, field.slug)),
                 ),
         ),
      );
      const data = {
         ...values,
         ...(icon && { icon: str(row.icon) }),
         sort_order: num(row.sort_order),
         is_visible: row.is_visible !== false,
      };
      if (row.guid) await updateRow(table, { guid: row.guid, ...data });
      else await createRow(table, { guid: newId(), ...data });
      await refreshTable(id);
   }

   async removeRow(id: SiteTableId, guid: string) {
      await deleteRow(SITE_TABLES[id].table, guid);
      await refreshTable(id);
   }

   async showRow(id: SiteTableId, guid: string, shown: boolean) {
      await updateRow(SITE_TABLES[id].table, { guid, is_visible: shown });
      await refreshTable(id);
   }

   // A table in its new order: only the rows that moved are written.
   async reorderRows(id: SiteTableId, rows: Row[]) {
      await Promise.all(
         rows.flatMap((row, index) =>
            num(row.sort_order) === index + 1
               ? []
               : [
                    updateRow(SITE_TABLES[id].table, {
                       guid: row.guid,
                       sort_order: index + 1,
                    }),
                 ],
         ),
      );
      await refreshTable(id);
   }

   // ---- contacts, logos and videos: one row
   async saveContacts(contacts: SiteContacts) {
      const row = {
         email: contacts.email,
         phone: contacts.phone,
         map_url: contacts.mapUrl,
         telegram: contacts.telegram,
         linkedin: contacts.linkedin,
         instagram: contacts.instagram,
         ...localizedRow('address', contacts.address),
         ...localizedRow('hours', contacts.hours),
         founders_video: contacts.foundersVideo,
         investors_video: contacts.investorsVideo,
         logo: contacts.logo,
         logo_white: contacts.logoWhite,
      };
      if (contacts.id)
         await updateRow('site_settings', { guid: contacts.id, ...row });
      else await createRow('site_settings', { guid: newId(), ...row });
      await refresh('contacts');
   }

   uploadFile(file: File) {
      return uploadFile(file, SITE_FILES_FOLDER);
   }

   // ---- what partners sent
   async savePartner(
      id: string,
      change: { status?: PartnerStatus; ownerId?: string; note?: string },
   ) {
      await updateRow('partner_requests', {
         guid: id,
         ...(change.status && { status: change.status }),
         ...(change.ownerId !== undefined && { owner_id: change.ownerId }),
         ...(change.note !== undefined && { note: change.note }),
      });
      await refresh('partners');
   }

   async removePartner(id: string) {
      await deleteRow('partner_requests', id);
      await refresh('partners');
   }

   newNews(): SiteNews {
      const empty = (): Localized => ({ ru: '', uz: '', en: '' });
      return {
         id: '',
         slug: '',
         date: todayISO(),
         category: 'Fund',
         outlet: '',
         url: '',
         image: '',
         published: false,
         title: empty(),
         excerpt: empty(),
         body: empty(),
      };
   }

   newSource(kind: SiteSourceKind, order: number): SiteSource {
      return {
         id: '',
         kind,
         name: '',
         url: '',
         text: { ru: '', uz: '', en: '' },
         order,
         visible: true,
      };
   }
}

export default new Site();
