// The public website, as the panel's «Сайт» keeps it (src/modules/Site).

export type SiteLanguage = 'ru' | 'uz' | 'en';
export type Localized = Record<SiteLanguage, string>;

export const SITE_CATEGORIES = [
   'Fund',
   'Portfolio',
   'Events',
   'Press',
] as const;
export type SiteCategory = (typeof SITE_CATEGORIES)[number];

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
