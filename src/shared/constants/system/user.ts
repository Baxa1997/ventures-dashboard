import type { Employee, Role } from '@shared/types/work.types';

// Labels are keys of the "layout" translations.
export const ROLE_LABELS = {
   director: 'Директор',
   deputy: 'Зам. директора',
   analyst: 'Аналитик',
   manager: 'Проектный менеджер',
   accountant: 'Главный бухгалтер',
   assistant: 'Ассистент директора',
} as const satisfies Record<Role, string>;

// The fund's team, a stand-in until employees come from the backend.
export const TEAM: Employee[] = [
   { id: 'e1', name: 'Тигран Бекмуллин', role: 'director' },
   { id: 'e2', name: 'Ш. Юлдашев', role: 'deputy' },
   { id: 'e3', name: 'Дилшод Мирзаев', role: 'analyst' },
   { id: 'e4', name: 'Б. Усмонов', role: 'analyst' },
   { id: 'e5', name: 'Р. Исмаилов', role: 'manager' },
   { id: 'e6', name: 'Г. Абдуллаева', role: 'accountant' },
   { id: 'e7', name: 'М. Саидова', role: 'assistant' },
];

// Tasks nobody is assigned to go to this person.
export const DIRECTOR_ID = 'e1';

/* Stand-in for signing in until authentication is connected: the sidebar lets
   you switch between these people, to see the pages as each of them does. */
export const SIGN_IN_IDS = ['e1', 'e3'];

export const DEFAULT_USER_ID = DIRECTOR_ID;
