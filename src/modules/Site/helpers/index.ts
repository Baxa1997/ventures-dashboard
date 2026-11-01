import type { Localized } from '@shared/types/site.types';
import { SITE_LANGUAGES } from '../constants';

export const emptyLocalized = (): Localized => ({ ru: '', uz: '', en: '' });

// In which languages a record is written, for the marks beside its name.
export const filledIn = (...values: Localized[]) =>
   SITE_LANGUAGES.filter((language) =>
      values.every((value) => value[language].replace(/<[^>]+>/g, '').trim()),
   );

// The name of a record in the language it has.
export const firstOf = (value: Localized) => value.ru || value.en || value.uz;

const LATIN: Record<string, string> = {
   а: 'a',
   б: 'b',
   в: 'v',
   г: 'g',
   д: 'd',
   е: 'e',
   ё: 'e',
   ж: 'zh',
   з: 'z',
   и: 'i',
   й: 'y',
   к: 'k',
   л: 'l',
   м: 'm',
   н: 'n',
   о: 'o',
   п: 'p',
   р: 'r',
   с: 's',
   т: 't',
   у: 'u',
   ф: 'f',
   х: 'h',
   ц: 'ts',
   ч: 'ch',
   ш: 'sh',
   щ: 'sch',
   ъ: '',
   ы: 'y',
   ь: '',
   э: 'e',
   ю: 'yu',
   я: 'ya',
   ў: 'o',
   ғ: 'g',
   қ: 'q',
   ҳ: 'h',
};

// The address of a page from its title; a taken one gets a number.
export const slugOf = (title: string, taken: string[] = []) => {
   const base =
      [...title.toLowerCase()]
         .map((letter) => LATIN[letter] ?? letter)
         .join('')
         .replace(/[^a-z0-9]+/g, '-')
         .replace(/^-+|-+$/g, '')
         .slice(0, 80) || 'page';
   let slug = base;
   for (let number = 2; taken.includes(slug); number++)
      slug = `${base}-${number}`;
   return slug;
};

export const moved = <T extends { id: string }>(
   list: T[],
   id: string,
   step: number,
) => {
   const from = list.findIndex((item) => item.id === id);
   const to = from + step;
   if (from < 0 || to < 0 || to >= list.length) return null;
   const next = [...list];
   const [item] = next.splice(from, 1);
   next.splice(to, 0, item);
   return next;
};
