import { listOf } from '@modules/Settings/services';
import { directorId } from '@shared/constants';
import { daysUntil, todayISO } from '@shared/helpers';
import type { Contract, ContractInput } from '@shared/types/contracts.types';
import { EXPIRING_DAYS, INVEST_TYPE } from '../constants';

/* What a status brings with it: a contract sent for approval has someone to
   approve it, the director unless named; a signed one has its date. */
export const settled = (
   input: ContractInput,
   today = todayISO(),
): ContractInput => ({
   ...input,
   ...(input.status === 'approval' &&
      !input.approverId && { approverId: directorId() }),
   ...(input.status === 'signed' && !input.signedDate && { signedDate: today }),
});

// Ending soon or already past its date, unless marked as expired: its date
// shows in red.
export const isEnding = (
   { validUntil, status }: Contract,
   today = todayISO(),
) =>
   !!validUntil &&
   status !== 'expired' &&
   daysUntil(validUntil, today) <= EXPIRING_DAYS;

// A signed contract ending within the days ahead, for Мой день.
export const isExpiring = (contract: Contract, today = todayISO()) => {
   if (contract.status !== 'signed' || !contract.validUntil) return false;
   const days = daysUntil(contract.validUntil, today);
   return days >= 0 && days <= EXPIRING_DAYS;
};

export const typeColor = (key: string) =>
   listOf('contractTypes', true).find((item) => item.key === key)?.color ||
   undefined;

// The investment contract of a deal, a signed one first.
export const investmentContractOf = (contracts: Contract[], dealId: string) => {
   const own = contracts.filter(
      (contract) => contract.dealId === dealId && contract.type === INVEST_TYPE,
   );
   return own.find(({ status }) => status === 'signed') ?? own[0];
};

// The person who approves it waits to decide while it is on approval.
export const awaitsContractApproval = (contract: Contract, userId: string) =>
   contract.status === 'approval' && contract.approverId === userId;
