import {
   ACCESS,
   ESCALATION_LABELS,
   INDUSTRY_MANDATES,
   LISTS,
   METRIC_FORMAT_LABELS,
   ROLE_LABELS,
   STATUS_GROUPS,
} from '@modules/Settings/constants';
import { stageName } from '@modules/Settings/services';
import { ROLE_LABELS as SYSTEM_ROLES } from '@shared/constants';
import type {
   ListItem,
   ListItemInput,
   ListKind,
   StaffInput,
   StaffMember,
   StageInput,
   StageItem,
} from '@shared/types/settings.types';
import type { TFunction } from 'i18next';

// The marks a row carries as on or off: a switch in its row.
export const SWITCH_LABELS = {
   inMandate: 'В мандате',
   onSite: 'На сайте',
   isMandate: 'По мандату',
} as const;
export type SwitchFlag = keyof typeof SWITCH_LABELS;
export const isSwitchFlag = (flag: string | null): flag is SwitchFlag =>
   !!flag && flag in SWITCH_LABELS;

// A row as it is written back: everything but its guid and place.
export const inputOf = ({
   id: _id,
   sortOrder: _sortOrder,
   ...input
}: ListItem): ListItemInput => input;

export const stageInputOf = (stage: StageItem): StageInput => ({
   key: stage.key,
   names: stage.names,
   norm: stage.norm,
   paused: stage.paused,
   escalation: stage.escalation,
   isPublic: stage.isPublic,
});

// How the journal shows a row: its names, its mark and whether it is used.
export const describeRow = (
   t: TFunction<'settings'>,
   kind: ListKind,
   row: ListItemInput | null,
) => {
   if (!row) return '';
   const flag = LISTS[kind].flag;
   const mark =
      flag === 'mandate'
         ? t(INDUSTRY_MANDATES[row.mandate ?? 'allowed'].label)
         : flag === 'group'
           ? t(STATUS_GROUPS[row.group ?? 'progress'])
           : flag === 'format'
             ? t(METRIC_FORMAT_LABELS[row.format ?? 'number'])
             : flag === 'file'
               ? (row.file?.name ?? '')
               : flag === 'weight'
                 ? `${row.weight ?? 0}%`
                 : isSwitchFlag(flag) && row[flag]
                 ? t(SWITCH_LABELS[flag])
                 : '';
   return [
      [row.names.ru, row.names.uz, row.names.en].filter(Boolean).join(' / '),
      mark,
      row.color,
      row.active ? t('используется') : t('отключён'),
   ]
      .filter(Boolean)
      .join(' · ');
};

// How the journal shows a stage: its name, norm, pause, escalation.
export const describeStage = (
   t: TFunction<'settings'>,
   stage: StageInput | null,
) =>
   stage
      ? [
           stage.names.ru || stageName(stage.key),
           stage.norm,
           stage.paused,
           stage.escalation && t(ESCALATION_LABELS[stage.escalation]),
           stage.isPublic && t('видна основателю'),
        ]
           .filter(Boolean)
           .join(' · ')
      : '';

export const staffInputOf = ({
   id: _id,
   addedAt: _addedAt,
   ...input
}: StaffMember): StaffInput => input;

const STAFF_FIELDS = [
   'name',
   'position',
   'email',
   'phone',
   'role',
   'roles',
   'access',
   'active',
] as const satisfies readonly (keyof StaffInput)[];

const STAFF_LABELS = {
   name: 'Имя',
   position: 'Должность',
   email: 'Почта',
   phone: 'Телефон',
   role: 'Роль в системе',
   roles: 'Обязанности',
   access: 'Доступ',
   active: 'Активен',
} as const satisfies Record<(typeof STAFF_FIELDS)[number], string>;

/* What changed for a person: the fields that differ (`patch`, so nothing
   else is written back), and how the journal shows them before and after,
   «Доступ: Рабочий». */
export const staffChange = (
   t: TFunction<'settings'>,
   tLayout: TFunction<'layout'>,
   before: StaffInput,
   after: StaffInput,
) => {
   const value = (
      input: StaffInput,
      field: (typeof STAFF_FIELDS)[number],
   ) => {
      if (field === 'role') return tLayout(SYSTEM_ROLES[input.role]);
      if (field === 'roles')
         return input.roles.map((role) => t(ROLE_LABELS[role])).join(', ');
      if (field === 'access') return t(ACCESS[input.access].label);
      if (field === 'active') return input.active ? t('да') : t('нет');
      return input[field];
   };
   const changed = STAFF_FIELDS.filter(
      (field) => value(before, field) !== value(after, field),
   );
   const describe = (input: StaffInput) =>
      changed
         .map(
            (field) =>
               `${t(STAFF_LABELS[field])}: ${value(input, field) || '—'}`,
         )
         .join('; ');
   const patch: Partial<StaffInput> = Object.fromEntries(
      changed.map((field) => [field, after[field]]),
   );
   return { from: describe(before), to: describe(after), patch };
};
