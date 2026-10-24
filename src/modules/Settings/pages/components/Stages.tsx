import { ESCALATION_LABELS } from '@modules/Settings/constants';
import settings, { stageName } from '@modules/Settings/services';
import { useAction, useCurrentUser } from '@shared/hooks';
import {
   Badge,
   Card,
   ItemActions,
   Spinner,
   Table,
   TD,
   TH,
} from '@shared/components';
import type { StageItem } from '@shared/types/settings.types';
import clsx from 'clsx';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface StagesProps {
   stages: StageItem[];
   removed: string[]; // the platform's stages the fund deleted
   editable: boolean;
   onEdit: (stage: StageItem) => void;
   onDelete: (stage: StageItem) => void; // asks first
}

const ICON_BUTTON =
   'text-ink-soft hover:bg-ground hover:text-ink grid size-7 place-items-center rounded-md disabled:pointer-events-none disabled:opacity-30';

/* The stages of a deal in their order, with their norms in working days.
   The fund adds, renames, moves and deletes any of them; a deleted stage's
   deals move to another first. A system stage carries the platform's rules
   (the exit conditions, the committee, the portfolio): deleted, it is listed
   below the table and can be brought back. Сделки count deadlines by the
   norms. */
const Stages = ({
   stages,
   removed,
   editable,
   onEdit,
   onDelete,
}: StagesProps) => {
   const { t } = useTranslation('settings');
   const user = useCurrentUser();
   // the button whose request runs, for its spinner; the others wait
   const [target, setTarget] = useState('');
   const moving = useAction(
      (stage: StageItem, step: -1 | 1) => settings.moveStage(stage.key, step),
      { success: t('Порядок этапов сохранён') },
   );
   const restoring = useAction(
      (key: string) =>
         settings.restoreStage(
            key,
            user.id,
            t('Этап «{{name}}» возвращён', { name: stageName(key) }),
         ),
      { success: t('Этап возвращён') },
   );
   const busy = moving.pending || restoring.pending;
   const spins = (id: string) => busy && target === id;

   const move = (stage: StageItem, step: -1 | 1) => {
      setTarget(`${stage.key}${step}`);
      moving.run(stage, step);
   };

   const restore = (key: string) => {
      setTarget(key);
      restoring.run(key);
   };

   return (
      <Card className='flex flex-col'>
         <Table
            className='min-w-2xl'
            head={
               <>
                  {editable && (
                     <th className={clsx(TH, 'w-16')}>
                        <span className='sr-only'>{t('Порядок')}</span>
                     </th>
                  )}
                  <th className={TH}>{t('Этап')}</th>
                  <th className={TH}>{t('Норма')}</th>
                  <th className={TH}>{t('Часы стоят, когда')}</th>
                  <th className={TH}>{t('Эскалация')}</th>
                  {editable && (
                     <th className={clsx(TH, 'w-20')}>
                        <span className='sr-only'>{t('Действия')}</span>
                     </th>
                  )}
               </>
            }
         >
            {stages.map((stage, index) => (
               <tr key={stage.key}>
                  {editable && (
                     <td className={clsx(TD, 'py-1')}>
                        <div className='flex'>
                           <button
                              aria-label={t('Выше')}
                              className={ICON_BUTTON}
                              disabled={busy || index === 0}
                              type='button'
                              onClick={() => move(stage, -1)}
                           >
                              {spins(`${stage.key}-1`) ? (
                                 <Spinner />
                              ) : (
                                 <ChevronUp className='size-4' />
                              )}
                           </button>
                           <button
                              aria-label={t('Ниже')}
                              className={ICON_BUTTON}
                              disabled={busy || index === stages.length - 1}
                              type='button'
                              onClick={() => move(stage, 1)}
                           >
                              {spins(`${stage.key}1`) ? (
                                 <Spinner />
                              ) : (
                                 <ChevronDown className='size-4' />
                              )}
                           </button>
                        </div>
                     </td>
                  )}
                  <td className={TD}>
                     <div className='flex flex-wrap items-center gap-2'>
                        <span className='font-semibold'>
                           {stageName(stage.key)}
                        </span>
                        {stage.isSystem ? (
                           <span className='text-ink-soft text-xs'>
                              {t('системный')}
                           </span>
                        ) : (
                           <Badge tone='accent'>{t('свой')}</Badge>
                        )}
                     </div>
                  </td>
                  <td className={clsx(TD, 'whitespace-nowrap')}>
                     {stage.norm || <span className='text-ink-faint'>—</span>}
                  </td>
                  <td className={clsx(TD, 'text-ink-soft')}>
                     {stage.paused || '—'}
                  </td>
                  <td className={clsx(TD, 'whitespace-nowrap')}>
                     {t(ESCALATION_LABELS[stage.escalation])}
                  </td>
                  {editable && (
                     <td className={clsx(TD, 'py-1')}>
                        <ItemActions
                           icons
                           name={stageName(stage.key)}
                           onDelete={() => onDelete(stage)}
                           onEdit={() => onEdit(stage)}
                        />
                     </td>
                  )}
               </tr>
            ))}
         </Table>
         {editable && removed.length > 0 && (
            <div className='border-line text-meta flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-5 py-3'>
               <span className='text-ink-soft'>
                  {t('Удалённые этапы платформы:')}
               </span>
               {removed.map((key) => (
                  <span key={key} className='flex items-center gap-2'>
                     {stageName(key)}
                     <button
                        type='button'
                        aria-busy={spins(key) || undefined}
                        className='link inline-flex items-center gap-1.5 disabled:opacity-50'
                        disabled={busy}
                        onClick={() => restore(key)}
                     >
                        {spins(key) && <Spinner className='size-3.5' />}
                        {t('Вернуть')}
                     </button>
                  </span>
               ))}
            </div>
         )}
         <p className='text-ink-soft border-line mt-auto border-t px-5 py-3 text-xs'>
            {t(
               'Норма — число рабочих дней, можно с пометкой: «5 · публично». Для ИК и Набсовета срок — дата заседания. Любой этап можно переименовать, передвинуть стрелками и удалить: сделки с него сначала перейдут на другой этап. Системные этапы несут правила платформы (условия перехода, заседания, портфель); удалённый системный этап можно вернуть.',
            )}
         </p>
      </Card>
   );
};

export default Stages;
