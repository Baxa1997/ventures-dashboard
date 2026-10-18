import { DATE_FORMAT, TEAM } from '@shared/constants';
import dayjs from 'dayjs';

export const todayISO = () => dayjs().format(DATE_FORMAT);

export const daysUntil = (date: string, today = todayISO()) =>
   dayjs(date).diff(dayjs(today), 'day');

export const capitalize = (text: string) =>
   text.charAt(0).toUpperCase() + text.slice(1);

// 5 окт; an empty date (not set yet) is a dash
export const formatDay = (date: string) =>
   date ? dayjs(date).format('D MMM') : '—';

// 5 октября
export const formatDate = (date: string) =>
   date ? dayjs(date).format('D MMMM') : '—';

// 5 окт 2026
export const formatDayYear = (date: string) =>
   date ? dayjs(date).format('D MMM YYYY') : '—';

// The day that is `count` working days (Monday to Friday) after `date`;
// a negative count goes back.
export const addWorkingDays = (date: string, count: number) => {
   let day = dayjs(date);
   const step = count < 0 ? -1 : 1;
   for (let left = Math.abs(count); left > 0;) {
      day = day.add(step, 'day');
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

// The short name of an employee, or '' for an unknown id.
export const personName = (id: string) => {
   const employee = TEAM.find((item) => item.id === id);
   return employee ? shortName(employee.name) : '';
};

// Working days from `from` to `to`, both counted: Fri 2 Oct → Fri 23 Oct is 16.
export const workingDaysBetween = (from: string, to: string) => {
   let count = 0;
   for (
      let day = dayjs(from);
      !day.isAfter(dayjs(to), 'day');
      day = day.add(1, 'day')
   )
      if (day.day() !== 0 && day.day() !== 6) count += 1;
   return count;
};

// 3 020 000 — the figure the way the language writes thousands
export const formatNumber = (value: number, language: string, digits = 0) =>
   new Intl.NumberFormat(language, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
   }).format(value);

// $3 020 000; a negative sum is written −$610 000
export const formatUsd = (value: number, language: string) =>
   `${value < 0 ? '−' : ''}$${formatNumber(Math.abs(value), language)}`;

// Saves the rows as a CSV file that Excel opens: UTF-8 with a byte order
// mark, cells separated by semicolons.
export const downloadCsv = (name: string, rows: string[][]) => {
   const cell = (raw: string) => {
      // a cell that starts like a formula is kept as text, so Excel does not run it
      const value = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
      return /[";\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
   };
   const text = rows.map((row) => row.map(cell).join(';')).join('\r\n');
   const url = URL.createObjectURL(
      new Blob(['﻿', text], { type: 'text/csv;charset=utf-8' }),
   );
   const link = document.createElement('a');
   link.href = url;
   link.download = name;
   link.click();
   URL.revokeObjectURL(url);
};

export { clearStores, createStore, newId, type Store } from './store';
