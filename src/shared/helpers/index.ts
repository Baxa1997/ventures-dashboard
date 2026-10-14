import { DATE_FORMAT, SAMPLE_TODAY } from '@shared/constants';
import dayjs from 'dayjs';

// See SAMPLE_TODAY: return dayjs().format(DATE_FORMAT) once the data is live.
export const todayISO = () => SAMPLE_TODAY;

export const daysUntil = (date: string, today = todayISO()) =>
   dayjs(date).diff(dayjs(today), 'day');

export const capitalize = (text: string) =>
   text.charAt(0).toUpperCase() + text.slice(1);

// 5 окт
export const formatDay = (date: string) => dayjs(date).format('D MMM');

// 5 октября
export const formatDate = (date: string) => dayjs(date).format('D MMMM');

// 5 окт 2026
export const formatDayYear = (date: string) => dayjs(date).format('D MMM YYYY');

// The day that is `count` working days (Monday to Friday) after `date`.
export const addWorkingDays = (date: string, count: number) => {
   let day = dayjs(date);
   for (let left = count; left > 0; ) {
      day = day.add(1, 'day');
      if (day.day() !== 0 && day.day() !== 6) left -= 1;
   }
   return day.format(DATE_FORMAT);
};

// "Тигран Бекмуллин" → "Т. Бекмуллин"; a name already given with an initial stays as is.
export const shortName = (name: string) => {
   const [first, ...rest] = name.split(' ');
   return rest.length && !first.endsWith('.')
      ? `${first[0]}. ${rest.join(' ')}`
      : name;
};
