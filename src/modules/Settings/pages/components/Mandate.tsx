import { INDUSTRY_MANDATES, MANDATE_FIELDS } from '@modules/Settings/constants';
import { nameOf } from '@modules/Settings/services';
import { Badge, Card, STACK } from '@shared/components';
import { SETTINGS_PATH } from '@shared/constants';
import type {
   ListItem,
   MandateField,
   SettingsState,
} from '@shared/types/settings.types';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { Draft } from '..';

interface MandateProps {
   data: SettingsState;
   draft: Draft;
   editable: boolean;
   errors: Partial<Record<MandateField, string>>; // fields that cannot be saved as written
   onChange: (draft: Draft) => void;
}

export const INPUT =
   'field-input text-meta h-8 disabled:bg-ground disabled:text-ink-soft';

/* The investment mandate: the check range and how the fund words its focus
   and exclusions, typed here; the stages, the geography and the sectors, as
   marked on the lists. Сделки check incoming applications against both. */
const Mandate = ({ data, draft, editable, errors, onChange }: MandateProps) => {
   const { t } = useTranslation('settings');
   const names = (items: ListItem[]) =>
      items.map(nameOf).join(', ') || t('не отмечены');
   const active = (items: ListItem[]) => items.filter((item) => item.active);
   const industries = active(data.lists.industries);
   const ofMandate = (mandate: keyof typeof INDUSTRY_MANDATES) =>
      industries.filter((item) => item.mandate === mandate);

   const marks = [
      {
         label: t('Стадии'),
         value: names(
            active(data.lists.rounds).filter((item) => item.inMandate),
         ),
         hint: t('Раунды, отмеченные «в мандате»'),
         section: 'rounds',
      },
      {
         label: t('География'),
         value: names(
            active(data.lists.countries).filter((item) => item.inMandate),
         ),
         hint: t('Страны, отмеченные «в мандате»'),
         section: 'countries',
      },
      ...(['focus', 'licensed', 'excluded'] as const).map((mandate) => ({
         label: t(INDUSTRY_MANDATES[mandate].label),
         value: names(ofMandate(mandate)),
         tone: INDUSTRY_MANDATES[mandate].tone,
         hint: t('Отрасли'),
         section: 'industries',
      })),
   ];

   return (
      <div className='gap-section grid flex-1 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]'>
         <div className={STACK}>
            <Card
               hint={t('основа — Инвестиционная политика')}
               title={t('Инвестиционный мандат')}
            >
               <div className='divide-line divide-y px-4.5'>
                  {MANDATE_FIELDS.map((field) => {
                     const { key, label, hint } = field;
                     const error = errors[key];
                     return (
                        <label
                           key={key}
                           className='grid items-center gap-x-5 gap-y-1.5 py-3 sm:grid-cols-[7rem_minmax(0,1.2fr)_minmax(0,1fr)]'
                        >
                           <span className='text-ink-soft'>{t(label)}</span>
                           <textarea
                              aria-invalid={!!error}
                              className={clsx(
                                 INPUT,
                                 'field-sizing-content h-auto min-h-8 resize-none py-1.25',
                              )}
                              disabled={!editable}
                              placeholder={
                                 'placeholder' in field
                                    ? field.placeholder
                                    : undefined
                              }
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
                           {error ? (
                              <span
                                 role='alert'
                                 className='text-danger text-xs'
                              >
                                 {error}
                              </span>
                           ) : (
                              <span className='text-ink-soft text-xs'>
                                 {t(hint)}
                              </span>
                           )}
                        </label>
                     );
                  })}
               </div>
            </Card>
         </div>
         <div className={STACK}>
            <Card title={t('Из справочников')}>
               <p className='text-ink-soft px-4.5 pt-3 text-xs'>
                  {t(
                     'Проверка входящих читает эти отметки. Они меняются в справочниках — так сайт и проверка не расходятся.',
                  )}
               </p>
               <dl className='divide-line divide-y px-4.5 pb-2'>
                  {marks.map((mark) => (
                     <div key={mark.label} className='py-3'>
                        <dt className='flex items-center justify-between gap-3'>
                           {'tone' in mark ? (
                              <Badge tone={mark.tone}>{mark.label}</Badge>
                           ) : (
                              <span className='text-ink-soft'>
                                 {mark.label}
                              </span>
                           )}
                           <Link
                              className='link text-xs'
                              data-hint={t('Перейти в этот раздел настроек')}
                              to={`${SETTINGS_PATH}/${mark.section}`}
                           >
                              {mark.hint}
                           </Link>
                        </dt>
                        <dd className='mt-1'>{mark.value}</dd>
                     </div>
                  ))}
               </dl>
            </Card>
         </div>
      </div>
   );
};

export default Mandate;
