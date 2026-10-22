import type { RuTranslation } from '@shared/i18n/ru';
import { z } from 'zod';
import { COMPANY_MAX, TEXT_MAX } from '../constants';

// Messages are keys of the "validation" translations.
export type ValidationKey = keyof RuTranslation['validation'];

const REQUIRED: ValidationKey = 'Обязательное поле';
const TOO_LONG: ValidationKey = 'Слишком длинное значение';
const DATE_INVALID: ValidationKey = 'Укажите дату';
const AMOUNT_INVALID: ValidationKey = 'Укажите сумму больше нуля';

const text = (max: number) => z.string().trim().max(max, TOO_LONG);
const required = (max: number) =>
   z.string().trim().min(1, REQUIRED).max(max, TOO_LONG);

export const newDealSchema = z.object({
   company: required(COMPANY_MAX),
   about: text(TEXT_MAX),
   industry: text(COMPANY_MAX), // the niche; the sector is chosen from the list
   amount: z.coerce
      .number({ message: AMOUNT_INVALID })
      .positive(AMOUNT_INVALID),
});

export const requestSchema = z.object({
   title: required(COMPANY_MAX * 2),
   text: text(TEXT_MAX),
   dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, DATE_INVALID),
});

export const workstreamSchema = z.object({
   name: required(COMPANY_MAX),
   executor: required(COMPANY_MAX * 2),
   dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, DATE_INVALID),
});

// The first message of each invalid field.
export const fieldErrors = <K extends string>(error: z.ZodError) => {
   const errors: Partial<Record<K, ValidationKey>> = {};
   for (const issue of error.issues) {
      const field = issue.path[0] as K;
      errors[field] ??= issue.message as ValidationKey;
   }
   return errors;
};
