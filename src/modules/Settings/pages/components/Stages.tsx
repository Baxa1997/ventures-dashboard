import { DEFAULT_STAGES, ESCALATION_LABELS } from '@modules/Settings/constants';
import { describeStage, stageInputOf } from '@modules/Settings/helpers';
import settings, { stageName } from '@modules/Settings/services';
import { Notice, Spinner, Switch } from '@shared/components';
import { toast } from '@shared/helpers/toast';
import { useAction, useCurrentUser } from '@shared/hooks';
import type {
   EscalateTo,
   StageInput,
   StageItem,
} from '@shared/types/settings.types';
import type { SupportedLanguageType } from '@shared/types/system/language.types';
import clsx from 'clsx';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
   ACTION_COLUMN,
   CELL,
   DictCard,
   DRAGGED_ROW,
   HANDLE_COLUMN,
   HEAD,
   ROW_SELECT,
   RowDelete,
   type RowDragProps,
   RowHandle,
   RowInput,
   STICKY_END,
   useRowDraft,
   useRowDrag,
   useRowOrder,
} from './Dict';

const LANGUAGES = [
   ['ru', 'Название (рус.)'],
   ['uz', 'Название (узб.)'],
   ['en', 'Название (англ.)'],
] as const satisfies readonly (readonly [SupportedLanguageType, string])[];

const ESCALATIONS = Object.keys(ESCALATION_LABELS) as EscalateTo[];

interface StageRowProps {
   stage: StageItem;
   editable: boolean;
   drag: RowDragProps;
   onDelete: () => void;
}

/* A stage changed where it stands: its names, its norm, when its clock
   stands, who a late deal goes to and whether founders see the norm. A
   system stage keeps the platform's name while its own is empty. */
const StageRow = ({ stage, editable, drag, onDelete }: StageRowProps) => {
   const { t } = useTranslation('settings');
   const user = useCurrentUser();
   const fallback = DEFAULT_STAGES.find(({ key }) => key === stage.key);

   const row = useRowDraft<StageInput>(async (draft) => {
      const current = (await settings.getSettings()).stages.find(
         ({ key }) => key === stage.key,
      );
      if (!current) return;
      const before = stageInputOf(current);
      const next = { ...before, ...draft };
      if (JSON.stringify(next) === JSON.stringify(before)) return;
      // a system stage may have no row yet (id ''): saving makes one
      await settings.saveStage(
         current.id,
         current.key,
         next,
         null,
         user.id,
         t('Этап «{{name}}»', { name: next.names.ru || stageName(next.key) }),
         (value) => describeStage(t, value),
      );
   });
   const shown = { ...stageInputOf(stage), ...row.draft };
   const saved = t('Сохранено');

   const rename = (language: SupportedLanguageType, name: string) => {
      if (language === 'ru' && !name && !fallback) {
         toast.error(t('Укажите название'));
         return;
      }
      row.change({ names: { ...shown.names, [language]: name } }, saved);
   };

   return (
      <tr className={clsx(drag.dragged && DRAGGED_ROW)} style={drag.style}>
         <td className={CELL}>{drag.handle}</td>
         {LANGUAGES.map(([language, label]) => (
            <td key={language} className={CELL}>
               <RowInput
                  disabled={!editable}
                  label={t(label)}
                  maxLength={60}
                  placeholder={
                     language === 'ru' && fallback ? t(fallback.label) : '—'
                  }
                  value={shown.names[language]}
                  onSave={(name) => rename(language, name)}
               />
            </td>
         ))}
         <td className={CELL}>
            <RowInput
               disabled={!editable}
               label={t('Норма')}
               maxLength={40}
               placeholder='—'
               title={t('рабочих дней, можно с пометкой: «5 · публично»')}
               value={shown.norm}
               onSave={(norm) => row.change({ norm }, saved)}
            />
         </td>
         <td className={CELL}>
            <RowInput
               disabled={!editable}
               label={t('Часы стоят, когда')}
               maxLength={120}
               placeholder='—'
               value={shown.paused}
               onSave={(paused) => row.change({ paused }, saved)}
            />
         </td>
         <td className={CELL}>
            <select
               aria-label={t('Эскалация')}
               className={ROW_SELECT}
               disabled={!editable}
               value={shown.escalation}
               onChange={(event) =>
                  row.change(
                     { escalation: event.target.value as EscalateTo },
                     saved,
                  )
               }
            >
               {ESCALATIONS.map((escalation) => (
                  <option key={escalation} value={escalation}>
                     {t(ESCALATION_LABELS[escalation])}
                  </option>
               ))}
            </select>
         </td>
         <td className={CELL}>
            <Switch
               small
               checked={shown.isPublic}
               disabled={!editable}
               label={t('Норма видна основателю')}
               onChange={(isPublic) => row.change({ isPublic }, saved)}
            />
         </td>
         <td className={clsx(CELL, STICKY_END)}>
            {editable && (
               <RowDelete name={stageName(stage.key)} onDelete={onDelete} />
            )}
         </td>
      </tr>
   );
};

interface StagesProps {
   stages: StageItem[];
   removed: string[]; // the platform's stages the fund deleted
   editable: boolean;
   onAdd: () => void;
   onDelete: (stage: StageItem) => void; // asks first
}

/* The stages of a deal in their order, with their norms in working days,
   edited where they stand. The fund adds, renames, moves and deletes any of
   them; a deleted stage's deals move to another first. A system stage
   carries the platform's rules (the exit conditions, the committee, the
   portfolio): deleted, it is listed below the rows and can be brought back.
   Сделки count deadlines by the norms. */
const Stages = ({
   stages,
   removed,
   editable,
   onAdd,
   onDelete,
}: StagesProps) => {
   const { t } = useTranslation('settings');
   const user = useCurrentUser();
   const order = useRowOrder(
      stages,
      (stage) => stage.key,
      (key, to) => settings.moveStage(key, to),
   );
   const drag = useRowDrag(order.move);
   // the stage being brought back, for its spinner; the others wait
   const [target, setTarget] = useState('');
   const restoring = useAction(
      (key: string) =>
         settings.restoreStage(
            key,
            user.id,
            t('Этап «{{name}}» возвращён', { name: stageName(key) }),
         ),
      { success: t('Этап возвращён') },
   );
   const restore = (key: string) => {
      setTarget(key);
      restoring.run(key);
   };

   return (
      <>
         <DictCard
            addHint={t('Добавить этап в путь сделки')}
            addLabel={t('Добавить этап')}
            body={drag.body}
            className='min-w-[54rem]'
            editable={editable}
            note={
               editable
                  ? t(
                       'Изменения сохраняются сразу и попадают в журнал. Пустое русское название системного этапа — его название в платформе.',
                    )
                  : t('Менять этапы может только директор')
            }
            extra={
               editable &&
               removed.length > 0 && (
                  <div className='border-line text-meta flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-4.5 py-2'>
                     <span className='text-ink-soft'>
                        {t('Удалённые этапы платформы:')}
                     </span>
                     {removed.map((key) => (
                        <span key={key} className='flex items-center gap-2'>
                           {stageName(key)}
                           <button
                              type='button'
                              aria-busy={
                                 (restoring.pending && target === key) ||
                                 undefined
                              }
                              className='link inline-flex items-center gap-1.5 disabled:opacity-50'
                              data-hint={t('Вернуть этот этап в путь сделки')}
                              disabled={restoring.pending}
                              onClick={() => restore(key)}
                           >
                              {restoring.pending && target === key && (
                                 <Spinner className='size-3.5' />
                              )}
                              {t('Вернуть')}
                           </button>
                        </span>
                     ))}
                  </div>
               )
            }
            head={
               <>
                  <th className={clsx(HEAD, HANDLE_COLUMN)}>
                     <span className='sr-only'>{t('Порядок')}</span>
                  </th>
                  {LANGUAGES.map(([language, label]) => (
                     <th key={language} className={HEAD}>
                        {t(label)}
                     </th>
                  ))}
                  <th className={clsx(HEAD, 'w-24')}>{t('Норма')}</th>
                  <th className={HEAD}>{t('Часы стоят, когда')}</th>
                  <th className={clsx(HEAD, 'w-36')}>{t('Эскалация')}</th>
                  <th className={clsx(HEAD, 'w-18')}>{t('Публично')}</th>
                  <th className={clsx(HEAD, ACTION_COLUMN, STICKY_END)}>
                     <span className='sr-only'>{t('Действия')}</span>
                  </th>
               </>
            }
            onAdd={onAdd}
         >
            {order.rows.map((stage, index) => (
               <StageRow
                  key={stage.key}
                  drag={{
                     dragged: drag.dragged === index,
                     style: drag.rowStyle(index),
                     handle: editable && (
                        <RowHandle
                           count={order.rows.length}
                           index={index}
                           name={stageName(stage.key)}
                           onMove={order.move}
                           onPress={(event) => drag.press(index, event)}
                        />
                     ),
                  }}
                  editable={editable}
                  stage={stage}
                  onDelete={() => onDelete(stage)}
               />
            ))}
         </DictCard>
         <Notice className='mt-4'>
            {t(
               'Норма — число рабочих дней, можно с пометкой: «5 · публично». Для ИК и Набсовета срок — дата заседания. Любой этап можно переименовать, перетащить за ручку слева и удалить: сделки с него сначала перейдут на другой этап. Системные этапы несут правила платформы (условия перехода, заседания, портфель); удалённый системный этап можно вернуть.',
            )}
         </Notice>
      </>
   );
};

export default Stages;
