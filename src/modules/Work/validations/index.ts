import {
   CHECKLIST_MAX,
   CONTEXT_MAX,
   TASK_PRIORITY_ORDER,
   TASK_RECURRENCE_ORDER,
   TASK_RELATION_ORDER,
   TITLE_MAX,
} from '../constants';
import type { RuTranslation } from '@shared/i18n/ru';
import { z } from 'zod';
import type { TaskFormValues } from '../helpers';

// Messages are keys of the "validation" translations.
type ValidationKey = keyof RuTranslation['validation'];

const REQUIRED: ValidationKey = 'Обязательное поле';
const TOO_LONG: ValidationKey = 'Слишком длинное значение';
const DATE_INVALID: ValidationKey = 'Укажите дату';
const START_LATE: ValidationKey = 'Начало позже дедлайна';
const DATE = /^(\d{4}-\d{2}-\d{2})?$/;

const oneOf = <T extends string>(values: T[]) => z.enum(values as [T, ...T[]]);

// A task attached to a deal or a company names which one.
export const taskSchema: z.ZodType<TaskFormValues> = z
   .object({
      title: z.string().trim().min(1, REQUIRED).max(TITLE_MAX, TOO_LONG),
      type: z.string().min(1, REQUIRED), // a key of Настройки → Типы задач
      context: z.string().trim().max(CONTEXT_MAX, TOO_LONG),
      details: z.string(), // the rich editor's HTML
      relation: oneOf(TASK_RELATION_ORDER),
      relationId: z.string(),
      assigneeId: z.string(),
      reviewerId: z.string(),
      // the start and the deadline are optional
      startDate: z.string().regex(DATE, DATE_INVALID),
      dueDate: z.string().regex(DATE, DATE_INVALID),
      priority: oneOf(TASK_PRIORITY_ORDER),
      status: z.string().min(1, REQUIRED), // a key of Настройки → Статусы задач
      recurrence: oneOf(TASK_RECURRENCE_ORDER),
      checklist: z.string().max(CHECKLIST_MAX, TOO_LONG),
   })
   .superRefine((values, context) => {
      if (values.relation !== 'none' && !values.relationId)
         context.addIssue({
            code: z.ZodIssueCode.custom,
            message: REQUIRED,
            path: ['relationId'],
         });
      if (
         values.startDate &&
         values.dueDate &&
         values.startDate > values.dueDate
      )
         context.addIssue({
            code: z.ZodIssueCode.custom,
            message: START_LATE,
            path: ['startDate'],
         });
   });

export type TaskFormErrors = Partial<
   Record<keyof TaskFormValues, ValidationKey>
>;

// The first message of each invalid field.
export const getFieldErrors = (error: z.ZodError): TaskFormErrors => {
   const errors: TaskFormErrors = {};
   for (const issue of error.issues) {
      const field = issue.path[0] as keyof TaskFormValues;
      errors[field] ??= issue.message as ValidationKey;
   }
   return errors;
};
