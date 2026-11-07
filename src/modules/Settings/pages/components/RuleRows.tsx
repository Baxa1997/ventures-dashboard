import settings from '@modules/Settings/services';
import { Card, InlineField } from '@shared/components';
import { useCurrentUser } from '@shared/hooks';
import type { FundRules } from '@shared/types/settings.types';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type NumberRule = {
   [K in keyof FundRules]: FundRules[K] extends number ? K : never;
}[keyof FundRules];

export interface RuleRow {
   key: NumberRule;
   label: string; // translated
   unit: string; // translated, after the number
   min: number;
   max: number;
   stored?: boolean; // false: ucode has no field for it yet
   check?: (value: number, rules: FundRules) => string | undefined;
}

interface RuleRowsProps {
   rules: FundRules;
   rows: RuleRow[];
   editable: boolean;
   footer?: ReactNode;
   children?: ReactNode; // more under the numbers
}

/* Numbers the fund works by, each changed where it stands: checked as it is
   left, saved at once, and written to the journal with what it was. */
const RuleRows = ({
   rules,
   rows,
   editable,
   footer,
   children,
}: RuleRowsProps) => {
   const { t } = useTranslation('settings');
   const user = useCurrentUser();

   return (
      <Card className='flex flex-col'>
         <dl className='divide-line flex max-w-2xl flex-col divide-y px-4.5 py-1'>
            {rows.map(({ key, label, unit, min, max, stored = true, check }) => (
               <div
                  key={key}
                  className='grid items-center gap-x-4 gap-y-1 py-2.5 sm:grid-cols-[minmax(0,1fr)_7rem_minmax(0,9rem)]'
               >
                  <dt className='text-ink-soft'>{label}</dt>
                  <dd>
                     <InlineField
                        className='text-right font-semibold tabular-nums'
                        disabled={!editable || !stored}
                        inputMode='numeric'
                        label={label}
                        maxLength={4}
                        validate={(text) => {
                           const value = Number(text);
                           if (!/^\d+$/.test(text) || value < min || value > max)
                              return t('Целое число от {{min}} до {{max}}', {
                                 min,
                                 max,
                              });
                           return check?.(value, rules);
                        }}
                        value={String(rules[key])}
                        onSave={(text) =>
                           settings.saveRules({ [key]: Number(text) }, user.id, {
                              [key]: label,
                           })
                        }
                     />
                  </dd>
                  <span className='text-ink-soft text-meta'>{unit}</span>
               </div>
            ))}
         </dl>
         {children}
         {footer && (
            <p className='text-ink-soft border-line mt-auto border-t px-4.5 py-2.5 text-xs'>
               {footer}
            </p>
         )}
      </Card>
   );
};

export default RuleRows;
