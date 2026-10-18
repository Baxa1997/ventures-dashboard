import type { Employee, Role } from '@shared/types/work.types';

// Labels are keys of the "layout" translations.
export const ROLE_LABELS = {
   director: 'Директор',
   deputy: 'Зам. директора',
   analyst: 'Аналитик',
   manager: 'Проектный менеджер',
   accountant: 'Главный бухгалтер',
   assistant: 'Ассистент директора',
   ic_secretary: 'Секретарь ИК',
   lawyer: 'Юрист',
   other: 'Сотрудник',
} as const satisfies Record<Role, string>;

// The fund's team: the employees rows of ucode, read after signing in
// (useCurrentUser). Empty until then.
export const TEAM: Employee[] = [];

// Tasks nobody is assigned to go to the director.
export const directorId = () =>
   TEAM.find(({ role }) => role === 'director')?.id ?? '';
