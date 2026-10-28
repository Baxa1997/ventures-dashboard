import { DATE_FORMAT } from '@modules/Work/constants';
import { byDueDate, isDone, isMine, taskKey } from '@modules/Work/helpers';
import type { Task } from '@shared/types/work.types';
import dayjs, { type Dayjs } from 'dayjs';
import {
   TASK_VIEWS,
   TASK_WHO,
   TIMELINE_COLUMNS,
   type TaskView,
   type TaskWho,
   type TimelineScale,
} from '../constants';

export const toView = (value: string | null): TaskView =>
   TASK_VIEWS.find((view) => view === value) ?? 'list';

export const toWho = (value: string | null): TaskWho =>
   TASK_WHO.find((who) => who === value) ?? 'me';

export interface TaskFilters {
   type: string; // a task type's key, '' — every type
   query: string;
}

// The tasks the toolbar leaves: the person's or the team's, of a type, with
// the words in the number, the title, the description or the deal's name.
export const selectTasks = (
   tasks: Task[],
   who: TaskWho,
   { type, query }: TaskFilters,
   userId: string,
   targetName: (task: Task) => string,
) => {
   const words = query.trim().toLowerCase();
   return tasks.filter(
      (task) =>
         (who === 'all' || isMine(task, userId)) &&
         (!type || task.type === type) &&
         (!words ||
            [taskKey(task), task.title, task.context, targetName(task)]
               .join(' ')
               .toLowerCase()
               .includes(words)),
   );
};

// The open tasks by deadline (those without one last), then the closed ones,
// the latest closed first.
export const byDeadline = (tasks: Task[]) =>
   [...tasks].sort(
      (a, b) =>
         Number(isDone(a)) - Number(isDone(b)) ||
         (isDone(a)
            ? (b.completedAt ?? '').localeCompare(a.completedAt ?? '')
            : byDueDate(a, b)),
   );

// ---- the calendar: a month, Monday first

export const monthOf = (date: string) =>
   dayjs(date).startOf('month').format(DATE_FORMAT);

export const shiftMonth = (month: string, months: number) =>
   dayjs(month).add(months, 'month').format(DATE_FORMAT);

// The cells of a month: empty ones (null) up to its first day's weekday,
// then its days.
export const monthCells = (month: string): (string | null)[] => {
   const first = dayjs(month);
   const lead = (first.day() + 6) % 7;
   return [
      ...Array<null>(lead).fill(null),
      ...Array.from({ length: first.daysInMonth() }, (_, index) =>
         first.add(index, 'day').format(DATE_FORMAT),
      ),
   ];
};

// ---- the timeline: columns of days, weeks or months

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

// Where a scale opens: the Monday of last week, or three months back.
export const timelineStart = (scale: TimelineScale, today: string) =>
   (scale === 'month'
      ? dayjs(today).startOf('month').subtract(3, 'month')
      : monday(today).subtract(7, 'day')
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
   for (let index = 0; index < TIMELINE_COLUMNS[scale]; index += 1) {
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

// ---- the board: a column's cards in the order they were dragged to; the
// ones never dragged keep their order (by deadline) after them

export const inBoardOrder = (tasks: Task[], ids: string[] = []) => {
   const rank = new Map(ids.map((id, index) => [id, index]));
   return [...tasks].sort(
      (a, b) => (rank.get(a.id) ?? ids.length) - (rank.get(b.id) ?? ids.length),
   );
};
