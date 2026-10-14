import type { WaitingSource } from '@shared/types/work.types';

// Who an answer is expected from, written after the name. A colleague needs
// no note. Labels are keys of the "work" translations.
export const WAITING_SOURCE_LABELS = {
   applicant: 'заявитель',
   company: 'компания',
} as const satisfies Record<Exclude<WaitingSource, 'colleague'>, string>;
