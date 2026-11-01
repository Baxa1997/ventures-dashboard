import { parseAmount, todayISO } from '@shared/helpers';
import type { Deal } from '@shared/types/deals.types';
import type { Instrument, Investment } from '@shared/types/portfolio.types';
import type { TFunction } from 'i18next';

// The fund's first investment as typed in, before it is checked.
export interface InvestmentDraft {
   instrument: Instrument;
   amount: string;
   date: string;
   stakePct: string;
   valuation: string;
}

export type InvestmentErrors = Partial<
   Record<'amount' | 'date' | 'stakePct' | 'valuation', string>
>;

/* What the committee was asked to approve, paid today: the deal's request on its
   terms, as a SAFE where they do not say. A SAFE or a note has no stake until it
   converts; a share's follows from the post-money. */
export const investmentDraft = (deal: Deal): InvestmentDraft => {
   const { terms, amount } = deal;
   const post =
      terms?.preMoney && terms.roundSize ? terms.preMoney + terms.roundSize : 0;
   const instrument = terms?.instrument || 'safe';
   return {
      instrument,
      amount: amount ? String(amount) : '',
      date: todayISO(),
      stakePct:
         instrument === 'equity' && post && amount
            ? String(Math.round((amount / post) * 10000) / 100)
            : '',
      valuation: post ? String(post) : '',
   };
};

// A payment as it stands, to change it.
export const draftOf = (investment: Investment): InvestmentDraft => ({
   instrument: investment.instrument,
   amount: String(investment.amount),
   date: investment.date,
   stakePct: investment.stakePct === null ? '' : String(investment.stakePct),
   valuation: investment.valuation === null ? '' : String(investment.valuation),
});

// A share: its comma is always the decimal point.
const toPercent = (text: string) =>
   Number(text.replace(/\s/g, '').replace(',', '.'));

// The investment the draft holds, or what is wrong with it.
export const readInvestment = (
   t: TFunction<'deals'>,
   draft: InvestmentDraft,
): { investment: Investment } | { errors: InvestmentErrors } => {
   const errors: InvestmentErrors = {};
   const amount = parseAmount(draft.amount);
   if (!amount || amount <= 0) errors.amount = t('Укажите сумму в долларах');
   if (!draft.date) errors.date = t('Укажите дату платежа');
   else if (draft.date > todayISO())
      errors.date = t('Платёж не может быть позже сегодняшнего дня');
   const stakePct = draft.stakePct.trim() ? toPercent(draft.stakePct) : null;
   if (stakePct !== null && !(stakePct > 0 && stakePct <= 100))
      errors.stakePct = t('Доля — число от 0 до 100');
   const valuation = draft.valuation.trim()
      ? parseAmount(draft.valuation)
      : null;
   if (valuation !== null && !(valuation > 0))
      errors.valuation = t('Укажите оценку в долларах');
   if (Object.keys(errors).length) return { errors };
   return {
      investment: {
         instrument: draft.instrument,
         amount,
         date: draft.date,
         stakePct,
         valuation,
      },
   };
};
