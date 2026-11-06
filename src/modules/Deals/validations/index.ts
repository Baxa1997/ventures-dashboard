import { parseAmount } from '@shared/helpers';
import type { RuTranslation } from '@shared/i18n/ru';
import { z } from 'zod';
import { COMPANY_MAX, TEXT_MAX } from '../constants';

// Messages are keys of the "validation" translations.
export type ValidationKey = keyof RuTranslation['validation'];

const REQUIRED: ValidationKey = 'Обязательное поле';
const TOO_LONG: ValidationKey = 'Слишком длинное значение';
const DATE_INVALID: ValidationKey = 'Укажите дату';
const AMOUNT_INVALID: ValidationKey = 'Укажите сумму больше нуля';
const EMAIL_INVALID: ValidationKey = 'Введите корректный адрес почты';
const YEAR_INVALID: ValidationKey = 'Укажите год из четырёх цифр';
const COUNT_INVALID: ValidationKey = 'Укажите целое число';

export const EMAIL = /^\S+@\S+\.\S+$/;

const text = (max: number) => z.string().trim().max(max, TOO_LONG);
const required = (max: number) =>
   z.string().trim().min(1, REQUIRED).max(max, TOO_LONG);

export const newDealSchema = z.object({
   company: required(COMPANY_MAX),
   about: text(TEXT_MAX),
   industry: text(COMPANY_MAX), // the niche; the sector is chosen from the list
   amount: z.preprocess(
      (value) => (typeof value === 'string' ? parseAmount(value) : value),
      z.number({ message: AMOUNT_INVALID }).positive(AMOUNT_INVALID),
   ),
   legalName: text(COMPANY_MAX),
   tin: text(20),
   foundedYear: text(4),
   employees: text(7),
   website: text(COMPANY_MAX),
   applicantEmail: text(COMPANY_MAX),
   applicantPhone: text(30),
});

// «Данные стартапа»: the deal's fields, with the dates and the email checked.
export const startupSchema = newDealSchema.extend({
   city: text(COMPANY_MAX),
   aboutEn: text(TEXT_MAX),
   legalAddress: text(TEXT_MAX),
   foundedYear: z.string().trim().regex(/^(\d{4})?$/, YEAR_INVALID),
   employees: z.string().trim().regex(/^\d{0,7}$/, COUNT_INVALID),
   registeredAt: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, DATE_INVALID),
   receivedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, DATE_INVALID),
   applicantEmail: text(COMPANY_MAX).refine(
      (value) => !value || EMAIL.test(value),
      EMAIL_INVALID,
   ),
});

export const requestSchema = z.object({
   title: required(COMPANY_MAX * 2),
   text: text(TEXT_MAX),
   dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, DATE_INVALID),
   folder: z.string(),
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
