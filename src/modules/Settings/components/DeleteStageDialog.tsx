import settings, { stageName, stagesOf } from '@modules/Settings/services';
import { ConfirmDialog, Field } from '@shared/components';
import { useCurrentUser } from '@shared/hooks';
import type { StageItem } from '@shared/types/settings.types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface DeleteStageDialogProps {
   stage: StageItem | null; // null: the dialog is closed
   onClose: () => void;
}

// The deals on a stage move to another stage before it is deleted. A system
// stage can be brought back afterwards.
const DeleteStageDialog = ({ stage, onClose }: DeleteStageDialogProps) => {
   const { t } = useTranslation('settings');
   const user = useCurrentUser();
   // the count and the choice belong to the stage they were made for
   const [usage, setUsage] = useState({ key: '', count: 0 });
   const [choice, setChoice] = useState({ key: '', value: '' });
   const stages = stagesOf();
   const others = stages.filter(({ key }) => key !== stage?.key);
   const used = stage && usage.key === stage.key ? usage.count : null;
   // the stage before it, by default
   const replacement =
      choice.key === stage?.key
         ? choice.value
         : (stages[
              Math.max(0, stages.findIndex(({ key }) => key === stage?.key) - 1)
           ]?.key ?? '');

   useEffect(() => {
      if (!stage) return;
      let active = true;
      const done = (count: number) =>
         active && setUsage({ key: stage.key, count });
      settings
         .stageUsage(stage.key)
         .then(done)
         .catch(() => done(-1));
      return () => {
         active = false;
      };
   }, [stage]);

   const name = stage ? stageName(stage.key) : '';

   return (
      <ConfirmDialog
         confirmLabel={used ? t('Перевести и удалить') : t('Удалить')}
         disabled={used === null || used < 0 || (used > 0 && !replacement)}
         note={t('Удаление попадёт в журнал')}
         open={stage !== null}
         subtitle={t('Этапы и нормативы')}
         title={t('Удалить этап «{{name}}»?', { name })}
         onClose={onClose}
         onConfirm={() =>
            stage &&
            settings.deleteStage(
               stage.key,
               used ? replacement : null,
               user.id,
               t('Этап «{{name}}» удалён', { name }),
               name,
            )
         }
      >
         {stage?.isSystem && (
            <p className='bg-warning-tint text-warning-ink rounded-lg px-4 py-3'>
               {t(
                  'Это этап платформы: его правила (условия перехода, заседания, портфель) перестанут действовать. Вернуть его можно под таблицей этапов.',
               )}
            </p>
         )}
         {used === null && <p>{t('Проверяем, есть ли на этапе сделки…')}</p>}
         {used !== null && used < 0 && (
            <p className='text-danger'>
               {t('Не удалось проверить сделки на этапе.')}
            </p>
         )}
         {used === 0 && <p>{t('Сделок на этапе нет.')}</p>}
         {used !== null && used > 0 && (
            <>
               <p>
                  {t('На этапе «{{name}}» сейчас {{count}} сделка.', {
                     name,
                     count: used,
                  })}{' '}
                  {t('Перед удалением они перейдут на другой этап.')}
               </p>
               <Field label={t('Перевести на этап')}>
                  <select
                     className='field-input'
                     value={replacement}
                     onChange={(event) =>
                        setChoice({
                           key: stage?.key ?? '',
                           value: event.target.value,
                        })
                     }
                  >
                     {others.map(({ key }) => (
                        <option key={key} value={key}>
                           {stageName(key)}
                        </option>
                     ))}
                  </select>
               </Field>
            </>
         )}
      </ConfirmDialog>
   );
};

export default DeleteStageDialog;
