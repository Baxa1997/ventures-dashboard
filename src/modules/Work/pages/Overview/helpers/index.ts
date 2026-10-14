import { DATE_FORMAT } from '@modules/Work/constants';
import { formatDate } from '@modules/Work/helpers';
import dayjs from 'dayjs';

// The work week (Monday to Friday) of the next working day: on a Friday the
// overview already looks at the week ahead.
export const getDeadlineWeek = (today: string) => {
   let day = dayjs(today).add(1, 'day');
   while (day.day() === 0 || day.day() === 6) day = day.add(1, 'day');
   const monday = day.subtract(day.day() - 1, 'day');
   return {
      start: monday.format(DATE_FORMAT),
      end: monday.add(4, 'day').format(DATE_FORMAT),
   };
};

// 5–9 октября
export const formatRange = (start: string, end: string) =>
   dayjs(start).isSame(end, 'month')
      ? `${dayjs(start).format('D')}–${formatDate(end)}`
      : `${formatDate(start)} – ${formatDate(end)}`;

// $3 630 000
export const formatUsd = (amount: number, language: string) =>
   `$${new Intl.NumberFormat(language).format(amount)}`;

// $3,02 — the amount in millions; the word "млн" is added by the translation.
export const formatMillions = (amount: number, language: string, digits = 2) =>
   `$${new Intl.NumberFormat(language, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
   }).format(amount / 1_000_000)}`;

// $150K
export const formatThousands = (amount: number) =>
   `$${Math.round(amount / 1000)}K`;
