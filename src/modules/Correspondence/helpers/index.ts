import { formatDate } from '@shared/helpers';
import type { Letter } from '@shared/types/correspondence.types';
import dayjs from 'dayjs';
import type { TFunction } from 'i18next';

// "Исх. № 51", "Вх. 02/27-2-17628", "Исх. · проект"
export const letterNumber = (
   t: TFunction<'correspondence'>,
   letter: Letter,
) => {
   const kind = letter.direction === 'in' ? t('Вх.') : t('Исх.');
   if (letter.number) return `${kind} ${letter.number}`;
   return letter.status === 'signing' ? `${kind} · ${t('проект')}` : kind;
};

// "30 сентября", "июль", "к 5 октября", "—"
export const letterDate = (t: TFunction<'correspondence'>, letter: Letter) => {
   if (letter.due && !letter.date)
      return t('к {{date}}', { date: formatDate(letter.due) });
   if (!letter.date) return '—';
   return letter.date.length === 7
      ? dayjs(`${letter.date}-01`).format('MMMM')
      : formatDate(letter.date);
};
