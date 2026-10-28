import { DATE_FORMAT } from '@shared/constants';
import dayjs, { type Dayjs } from 'dayjs';

// A timeline's columns: days, weeks or months.
export type TimelineScale = 'day' | 'week' | 'month';

// The columns a scale shows: four weeks of days, sixteen weeks, a year.
const COLUMNS: Record<TimelineScale, number> = { day: 28, week: 16, month: 12 };

export interface TimelineColumn {
   from: string; // YYYY-MM-DD
   days: number;
   label: string; // 5, окт
   strong: string; // the month or the year a column opens, '' otherwise
   weekend: boolean;
   today: boolean;
}

export interface TimelineGrid {
   from: string;
   end: string; // the last day shown
   total: number; // days
   columns: TimelineColumn[];
   index: (date: string) => number; // the day's place from the start
}

const monday = (date: string) => {
   const day = dayjs(date);
   return day.subtract((day.day() + 6) % 7, 'day');
};

// Where a scale opens: the Monday some weeks back (one unless given), or
// three months back.
export const timelineStart = (
   scale: TimelineScale,
   today: string,
   weeksBack = 1,
) =>
   (scale === 'month'
      ? dayjs(today).startOf('month').subtract(3, 'month')
      : monday(today).subtract(7 * weeksBack, 'day')
   ).format(DATE_FORMAT);

// «‹ ›» move it by two weeks, four weeks or three months.
export const shiftTimeline = (
   scale: TimelineScale,
   from: string,
   step: number,
) =>
   (scale === 'month'
      ? dayjs(from).add(3 * step, 'month')
      : dayjs(from).add((scale === 'week' ? 28 : 14) * step, 'day')
   ).format(DATE_FORMAT);

const nextOf = (scale: TimelineScale, day: Dayjs) => {
   if (scale === 'day') return day.add(1, 'day');
   return scale === 'week' ? day.add(7, 'day') : day.add(1, 'month');
};

const labelOf = (scale: TimelineScale, day: Dayjs, first: boolean) => {
   if (scale === 'day') return { label: day.format('D'), strong: '' };
   if (scale === 'week')
      return {
         label: day.format('D'),
         strong: first || day.date() <= 7 ? day.format('MMM') : '',
      };
   return {
      label: day.format('MMM'),
      strong: first || day.month() === 0 ? day.format('YYYY') : '',
   };
};

export const timelineGrid = (
   scale: TimelineScale,
   from: string,
   today: string,
): TimelineGrid => {
   const start = dayjs(from);
   const columns: TimelineColumn[] = [];
   let day = start;
   for (let index = 0; index < COLUMNS[scale]; index += 1) {
      const next = nextOf(scale, day);
      const first = day.format(DATE_FORMAT);
      columns.push({
         from: first,
         days: next.diff(day, 'day'),
         ...labelOf(scale, day, index === 0),
         weekend: scale === 'day' && (day.day() === 0 || day.day() === 6),
         today: today >= first && today < next.format(DATE_FORMAT),
      });
      day = next;
   }
   return {
      from,
      end: day.subtract(1, 'day').format(DATE_FORMAT),
      total: day.diff(start, 'day'),
      columns,
      index: (date) => dayjs(date).diff(start, 'day'),
   };
};

// A stretch of the window as a CSS length: 3 days of 28 → 10.714%.
export const timelineShare = (days: number, total: number) =>
   `${((Math.max(0, Math.min(total, days)) / total) * 100).toFixed(3)}%`;
