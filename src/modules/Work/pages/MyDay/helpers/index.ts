import { capitalize } from '@modules/Work/helpers';
import { formatNumericDate } from '@shared/helpers';
import dayjs from 'dayjs';
import { MY_DAY_TABS, type MyDayTab } from '../constants';

export const toTab = (value: string | null): MyDayTab =>
   MY_DAY_TABS.find((tab) => tab === value) ?? 'mine';

// Понедельник, 27.10.2026
export const formatDayTitle = (date: string) =>
   `${capitalize(dayjs(date).format('dddd'))}, ${formatNumericDate(date)}`;
