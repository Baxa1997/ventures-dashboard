import { EMAIL_MAX, PASSWORD_MAX } from '@modules/Auth/constants';
import type { RuTranslation } from '@shared/i18n/ru';
import { z } from 'zod';

// Messages are keys of the "validation" translations.
type ValidationKey = keyof RuTranslation['validation'];

const REQUIRED: ValidationKey = 'Обязательное поле';
const TOO_LONG: ValidationKey = 'Слишком длинное значение';
const EMAIL_INVALID: ValidationKey = 'Введите корректный адрес почты';

export const loginSchema = z.object({
   email: z
      .string()
      .trim()
      .min(1, REQUIRED)
      .max(EMAIL_MAX, TOO_LONG)
      .email(EMAIL_INVALID),
   password: z.string().min(1, REQUIRED).max(PASSWORD_MAX, TOO_LONG),
});

export type LoginValues = z.infer<typeof loginSchema>;

export type LoginErrors = Partial<Record<keyof LoginValues, ValidationKey>>;

// The first message of each invalid field.
export const getFieldErrors = (error: z.ZodError): LoginErrors => {
   const errors: LoginErrors = {};
   for (const issue of error.issues) {
      const field = issue.path[0] as keyof LoginValues;
      errors[field] ??= issue.message as ValidationKey;
   }
   return errors;
};
