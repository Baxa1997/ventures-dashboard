import { IC_RULES } from '@modules/Committee/constants';
import {
   FLAG_FIELDS,
   MANDATE_FIELDS,
   NORM_STAGE_LABELS,
} from '@modules/Settings/constants';
import settings from '@modules/Settings/services';
import {
   Button,
   Card,
   FactList,
   STACK,
   Table,
   TD,
   TH,
} from '@shared/components';
import type { SettingsState } from '@shared/types/settings.types';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import type { Draft } from '..';

interface RulesProps {
   data: SettingsState;
   draft: Draft;
   editable: boolean;
   onChange: (draft: Draft) => void;
}

/* The investment mandate, the stage norms, the portfolio's risk flags and the
   committee's voting rules. The mandate's check and the stage norms are what
   Сделки check applications and count deadlines by. */
const Rules = ({ data, draft, editable, onChange }: RulesProps) => {
   const { t } = useTranslation('settings');
   const input =
      'field-input text-meta h-9 disabled:bg-ground disabled:text-ink-soft';

   return (
      <>
         {data.site && (
            <div className='bg-warning-tint mb-section flex flex-col gap-3 rounded-lg px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6'>
               <div className='min-w-0 flex-1'>
                  <p className='text-warning-ink font-semibold'>
                     {t('Мандат на сайте расходится с мандатом фонда')}
                  </p>
                  <p className='mt-0.5'>
                     {t(
                        'На сайте: чек {{siteCheck}}, стадии {{siteStages}}. Здесь: {{check}}, {{stages}}. Проверка входящих заявок и письма об отказе берут значения отсюда.',
                        {
                           siteCheck: data.site.check,
                           siteStages: data.site.stages,
                           check: data.mandate.check,
                           stages: data.mandate.stages.toLowerCase(),
                        },
                     )}
                  </p>
               </div>
               <Button
                  disabled={!editable}
                  variant='ghost'
                  onClick={() => settings.syncSite()}
               >
                  {t('Обновить сайт')}
               </Button>
            </div>
         )}
         <div className='gap-section grid flex-1 xl:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]'>
            <div className={STACK}>
               <Card
                  hint={t('основа — Инвестиционная политика')}
                  title={t('Инвестиционный мандат')}
               >
                  <div className='divide-line divide-y px-5'>
                     {MANDATE_FIELDS.map(({ key, label, hint }) => (
                        <label
                           key={key}
                           className='grid items-center gap-x-5 gap-y-1.5 py-3 sm:grid-cols-[7rem_minmax(0,1.2fr)_minmax(0,1fr)]'
                        >
                           <span className='text-ink-soft'>{t(label)}</span>
                           <textarea
                              className={clsx(
                                 input,
                                 'field-sizing-content h-auto min-h-9 resize-none py-1.5',
                              )}
                              disabled={!editable}
                              rows={1}
                              value={draft.mandate[key]}
                              onChange={(event) =>
                                 onChange({
                                    ...draft,
                                    mandate: {
                                       ...draft.mandate,
                                       [key]: event.target.value,
                                    },
                                 })
                              }
                           />
                           <span className='text-ink-soft text-xs'>
                              {t(hint)}
                           </span>
                        </label>
                     ))}
                  </div>
               </Card>
               <Card hint={t('рабочие дни')} title={t('Нормативы стадий')}>
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
                                 className={clsx(input, 'w-full max-w-32')}
                                 disabled={!editable}
                                 value={norm.norm}
                                 onChange={(event) =>
                                    onChange({
                                       ...draft,
                                       norms: draft.norms.map(
                                          (item, position) =>
                                             position === index
                                                ? {
                                                     ...item,
                                                     norm: event.target.value,
                                                  }
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
               </Card>
            </div>
            <div className={STACK}>
               <Card title={t('Флаги портфеля')}>
                  <div className='flex flex-col gap-2.5 px-5 py-4'>
                     {FLAG_FIELDS.map(({ key, label, unit }) => (
                        <label
                           key={key}
                           className='flex items-center justify-between gap-4'
                        >
                           <span className='text-ink-soft'>{t(label)}</span>
                           <span className='border-line-strong has-focus-visible:outline-accent flex h-9 w-40 items-center gap-1.5 rounded-lg border bg-white px-3 has-focus-visible:outline-2'>
                              <input
                                 className='text-meta w-10 min-w-0 flex-1 bg-transparent outline-none disabled:text-ink-soft'
                                 disabled={!editable}
                                 inputMode='numeric'
                                 value={draft.flags[key]}
                                 onChange={(event) => {
                                    const value = Number(
                                       event.target.value.replace(',', '.'),
                                    );
                                    if (!Number.isNaN(value))
                                       onChange({
                                          ...draft,
                                          flags: {
                                             ...draft.flags,
                                             [key]: value,
                                          },
                                       });
                                 }}
                              />
                              <span className='text-ink-soft text-meta'>
                                 {t(unit)}
                              </span>
                           </span>
                        </label>
                     ))}
                  </div>
               </Card>
               <Card title={t('Правила ИК')}>
                  <FactList
                     className='px-5 py-2'
                     labelWidth='9rem'
                     rows={[
                        {
                           label: t('Кворум'),
                           value: t('{{count}} член', {
                              count: IC_RULES.quorum,
                           }),
                        },
                        {
                           label: t('Материалы за'),
                           value: t('{{count}} рабочий день', {
                              count: IC_RULES.materialsDays,
                           }),
                        },
                        {
                           label: t('1 голос «против»'),
                           value: t('обсуждение, решает спонсор'),
                        },
                        { label: t('2 и более «против»'), value: t('отказ') },
                        { label: t('Особое мнение'), value: t('вето') },
                     ]}
                  />
                  <p className='text-ink-soft px-5 pb-4 text-xs'>
                     {t(
                        'Источник: «Чек-лист ИК» в Notion. Сверить с Положением об ИК — числа в положении главнее.',
                     )}
                  </p>
               </Card>
            </div>
         </div>
      </>
   );
};

export default Rules;
