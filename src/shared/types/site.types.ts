// The public website, as the panel's «Сайт» keeps it (src/modules/Site).

export type SiteLanguage = 'ru' | 'uz' | 'en';
export type Localized = Record<SiteLanguage, string>;

export const SITE_CATEGORIES = [
   'Fund',
   'Portfolio',
   'Events',
   'Market',
   'Press',
] as const;
export type SiteCategory = (typeof SITE_CATEGORIES)[number];

// The categories whose news open the outlet's article, not a page of the site.
export const LINKED_CATEGORIES: SiteCategory[] = ['Market', 'Press'];

export interface SiteNews {
   id: string;
   slug: string;
   date: string;
   category: SiteCategory;
   outlet: string;
   url: string;
   image: string;
   published: boolean;
   title: Localized;
   excerpt: Localized;
   body: Localized;
   // found by the news collector (Настройки → Сбор новостей; batch 28)
   collected: boolean;
   sourceId: string;
   foundAt: string;
   note: string; // why it was taken
   rejected: boolean; // turned down: hidden, and not collected again
   original: string; // the article's own text and pictures (HTML), for the editor only
   originalAt: string; // when the server read it; '' while it has not
}

// A source of the news collector (news_sources, batch 28).
export type NewsSourceKind = 'rss' | 'site' | 'telegram' | 'google';
export const NEWS_SOURCE_KINDS: NewsSourceKind[] = ['rss', 'site', 'telegram', 'google'];

export interface NewsSource {
   id: string;
   name: string;
   kind: NewsSourceKind;
   address: string;
   keywords: string;
   mentionsOnly: boolean;
   autoPublish: boolean;
   active: boolean;
   checkedAt: string;
   foundCount: number;
   error: string;
}

export interface SiteLegal {
   id: string;
   slug: string;
   published: boolean;
   title: Localized;
   body: Localized;
}

export type SiteSourceKind = 'media' | 'report';

export interface SiteSource {
   id: string;
   kind: SiteSourceKind;
   name: string;
   url: string;
   text: Localized;
   order: number;
   visible: boolean;
}

export interface SiteCompany {
   id: string;
   name: string;
   industry: string;
   stage: string;
   status: 'active' | 'exit';
   city: string;
   country: string;
   invested: number;
   year: string;
   website: string;
   founder: string;
   founderRole: string;
   founderLinkedin: string;
   order: number;
   visible: boolean;
   tagline: Localized;
   quote: Localized;
}

export interface SiteContacts {
   id: string; // '' until the row is made
   email: string;
   phone: string;
   mapUrl: string;
   telegram: string;
   linkedin: string;
   instagram: string;
   address: Localized;
   hours: Localized;
   foundersVideo: string;
   investorsVideo: string;
   logo: string;
   logoWhite: string;
}

export const PARTNER_STATUSES = ['new', 'in_work', 'closed'] as const;
export type PartnerStatus = (typeof PARTNER_STATUSES)[number];

export interface PartnerRequest {
   id: string;
   name: string;
   email: string;
   phone: string;
   country: string;
   request: string;
   locale: string;
   submittedAt: string;
   status: PartnerStatus;
   ownerId: string;
   note: string;
}
