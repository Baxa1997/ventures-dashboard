import {
   Badge,
   BadgeSelect,
   InlineField,
   ItemActions,
   Person,
} from '@shared/components';
import { TEAM } from '@shared/constants';
import { shortName } from '@shared/helpers';
import { useSaveQueue } from '@shared/hooks';
import type { Risk } from '@shared/types/deals.types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RISK_LEVEL_LABELS } from '../constants';

interface RiskListProps {
   risks: Risk[];
   onSave?: (risk: Risk) => unknown; // given: each risk is changed in its row
   onRemove?: (risk: Risk) => void; // given: a risk is deleted, after asking
}

const LEVELS = ['high', 'medium'] as const;

// Open risks, the high ones first: how grave each one is, what it is about
// and who owns it. Given `onSave`, every part is changed where it stands.
const RiskList = ({ risks, onSave, onRemove }: RiskListProps) => {
   const { t } = useTranslation('deals');
   const queue = useSaveQueue();
   const [busy, setBusy] = useState('');
   const sorted = [
      ...risks.filter(({ level }) => level === 'high'),
      ...risks.filter(({ level }) => level !== 'high'),
   ];

   // a change of one part of a risk; the memorandum's wording stays
   const change = (risk: Risk, patch: Partial<Risk>) => onSave?.({ ...risk, ...patch });

   const pick = async (risk: Risk, patch: Partial<Risk>) => {
      setBusy(risk.id);
      await queue(async () => {
         await change(risk, patch);
      });
      setBusy('');
   };

   return (
      <ul className='divide-line divide-y px-5 py-1'>
         {sorted.map((risk) => (
            <li
               key={risk.id}
               className='grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-4 gap-y-2 py-3.5 sm:grid-cols-[5.5rem_minmax(0,1fr)_9rem]'
            >
               <div>
                  {onSave ? (
                     <BadgeSelect
                        busy={busy === risk.id}
                        label={t('Уровень')}
                        options={LEVELS.map((level) => ({
                           value: level,
                           label: t(RISK_LEVEL_LABELS[level]),
                           tone: level === 'high' ? 'danger' : 'warning',
                        }))}
                        value={risk.level}
                        onChange={(level) => pick(risk, { level })}
                     />
                  ) : (
                     <Badge tone={risk.level === 'high' ? 'danger' : 'warning'}>
                        {t(RISK_LEVEL_LABELS[risk.level])}
                     </Badge>
                  )}
               </div>
               <div className='min-w-0'>
                  {onSave ? (
                     <>
                        <InlineField
                           className='font-medium'
                           label={t('Риск')}
                           maxLength={160}
                           validate={(next) =>
                              next ? undefined : t('Назовите риск')
                           }
                           value={risk.title}
                           onSave={(title) => change(risk, { title })}
                        />
                        <InlineField
                           className='text-ink-soft text-xs'
                           kind='multiline'
                           label={t('Комментарий')}
                           maxLength={400}
                           placeholder={t('Комментарий')}
                           value={risk.note}
                           onSave={(note) => change(risk, { note })}
                        />
                        <div className='text-ink-soft mt-1 grid gap-x-3 text-xs sm:grid-cols-[auto_minmax(0,1fr)]'>
                           <InlineField
                              kind='select'
                              label={t('Тяжесть')}
                              options={[
                                 { value: '', label: t('Тяжесть: —') },
                                 ...[1, 2, 3, 4, 5].map((value) => ({
                                    value: String(value),
                                    label: t('Тяжесть {{value}} из 5', {
                                       value,
                                    }),
                                 })),
                              ]}
                              value={risk.severity ? String(risk.severity) : ''}
                              onSave={(next) =>
                                 change(risk, {
                                    severity: next ? Number(next) : undefined,
                                 })
                              }
                           />
                           <InlineField
                              label={t('Мера')}
                              placeholder={t('Мера')}
                              value={risk.measure ?? ''}
                              onSave={(measure) =>
                                 change(risk, { measure: measure || undefined })
                              }
                           />
                        </div>
                     </>
                  ) : (
                     <>
                        <div className='font-medium'>{risk.title}</div>
                        {risk.note && (
                           <div className='text-ink-soft mt-1 text-xs'>
                              {risk.note}
                           </div>
                        )}
                     </>
                  )}
                  {onRemove && (
                     <ItemActions
                        className='mt-1.5 text-xs'
                        name={risk.title}
                        onDelete={() => onRemove(risk)}
                     />
                  )}
               </div>
               <div className='text-meta max-sm:col-start-2'>
                  {onSave ? (
                     <InlineField
                        kind='select'
                        label={t('Владелец')}
                        options={[
                           { value: '', label: t('нет владельца') },
                           ...TEAM.map(({ id, name }) => ({
                              value: id,
                              label: shortName(name),
                           })),
                        ]}
                        value={risk.ownerId}
                        onSave={(ownerId) => change(risk, { ownerId })}
                     />
                  ) : risk.ownerId ? (
                     <Person id={risk.ownerId} soft />
                  ) : (
                     <span className='text-warning-ink text-xs'>
                        {t('нет владельца')}
                     </span>
                  )}
               </div>
            </li>
         ))}
      </ul>
   );
};

export default RiskList;
