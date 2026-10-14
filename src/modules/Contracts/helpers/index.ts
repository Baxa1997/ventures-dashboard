import { daysUntil, formatNumber } from '@shared/helpers';
import type { Contract, ContractDetails } from '@shared/types/contracts.types';
import dayjs from 'dayjs';
import type { TFunction } from 'i18next';
import { EXPIRING_DAYS } from '../constants';

type T = TFunction<'contracts'>;

// 18,4 · 692,4 · 36,0 — sums under the contract are written to a tenth
export const formatSum = (value: number, language: string) =>
   formatNumber(value, language, 1);

// "сентябрь 2026" for an act's month
export const monthName = (month: string) =>
   dayjs(`${month}-01`).format('MMMM YYYY');

// What the year's limit has used: the acts (but returned ones) and the orders.
export const limitUse = (details: ContractDetails) => {
   const acts = details.acts.filter(({ status }) => status !== 'returned');
   const actsSum = acts.reduce((sum, { amount }) => sum + amount, 0);
   const ordersSum = details.orders.reduce(
      (sum, { amount }) => sum + amount,
      0,
   );
   const used = actsSum + ordersSum;
   return {
      acts,
      actsSum,
      ordersSum,
      used,
      left: details.limit - used,
      share: details.limit ? used / details.limit : 0,
   };
};

export const pendingAct = (details?: ContractDetails) =>
   details?.acts.find(({ status }) => status === 'pending');

// What needs doing: a pending act first, otherwise the register's own line.
export const attentionOf = (t: T, contract: Contract, language: string) => {
   const act = pendingAct(contract.details);
   if (act)
      return t('Акт за {{month}} — {{amount}} млн сум на согласовании', {
         month: dayjs(`${act.month}-01`).format('MMMM'),
         amount: formatSum(act.amount, language),
      });
   return contract.attention || '—';
};

export const isExpiring = (contract: Contract) =>
   contract.endDate !== null &&
   daysUntil(contract.endDate) >= 0 &&
   daysUntil(contract.endDate) <= EXPIRING_DAYS;
