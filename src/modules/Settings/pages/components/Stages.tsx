import { NORM_STAGE_LABELS } from '@modules/Settings/constants';
import { Card, Table, TD, TH } from '@shared/components';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import type { Draft } from '..';
import { INPUT } from './Mandate';

interface StagesProps {
   draft: Draft;
   editable: boolean;
   onChange: (draft: Draft) => void;
}

/* The stages of a deal with their norms in working days. The stages and their
   order are the platform's logic (the exit conditions depend on them); what
   the fund sets is how long each may take. Сделки count deadlines by it. */
const Stages = ({ draft, editable, onChange }: StagesProps) => {
   const { t } = useTranslation('settings');

   return (
      <Card
         className='flex flex-col'
         hint={t('рабочие дни')}
         title={t('Нормативы стадий')}
      >
         <Table
            className='min-w-xl'
            head={
               <>
                  <th className={TH}>{t('Стадия')}</th>
                  <th className={TH}>{t('Норма')}</th>
                  <th className={TH}>{t('Часы стоят, когда')}</th>
                  <th className={TH}>{t('Эскалация')}</th>
               </>
            }
         >
            {draft.norms.map((norm, index) => (
               <tr key={norm.stage}>
                  <td className={clsx(TD, 'font-semibold')}>
                     {t(NORM_STAGE_LABELS[norm.stage])}
                  </td>
                  <td className={clsx(TD, 'w-36')}>
                     <input
                        aria-label={t('Норма: {{stage}}', {
                           stage: t(NORM_STAGE_LABELS[norm.stage]),
                        })}
                        className={clsx(INPUT, 'w-full max-w-32')}
                        disabled={!editable}
                        value={norm.norm}
                        onChange={(event) =>
                           onChange({
                              ...draft,
                              norms: draft.norms.map((item, position) =>
                                 position === index
                                    ? { ...item, norm: event.target.value }
                                    : item,
                              ),
                           })
                        }
                     />
                  </td>
                  <td className={clsx(TD, 'text-ink-soft')}>
                     {norm.paused || '—'}
                  </td>
                  <td className={TD}>{norm.escalation}</td>
               </tr>
            ))}
         </Table>
         <p className='text-ink-soft border-line mt-auto border-t px-5 py-3 text-xs'>
            {t(
               'Норма — число рабочих дней, можно с пометкой: «5 · публично». Для ИК и Набсовета срок — дата заседания. Этапы и их порядок задаёт логика платформы: от них зависят условия перехода.',
            )}
         </p>
      </Card>
   );
};

export default Stages;
