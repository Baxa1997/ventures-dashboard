import { InlineField } from '@shared/components';
import { parseAmount } from '@shared/helpers';
import { useCurrentUser } from '@shared/hooks';
import { useTranslation } from 'react-i18next';
import finance from '../services';

interface AdjustCellProps {
   category: string; // the line item's key
   name: string; // its name, for the field's label
   month: string; // YYYY-MM
   currency: string;
   value: number; // the figure as the report counts it
   format: (value: number) => string;
}

/* A line item's figure for one month in P&L or Cash Flow, changed where it
   stands (10 Nov): its frame shows on hover, a click makes it a field, and
   the typed figure is reached by one «Корректировка» operation of that line
   item and month (finance.adjust), which Транзакции lists. Totals and
   balances stay sums. */
const AdjustCell = ({
   category,
   name,
   month,
   currency,
   value,
   format,
}: AdjustCellProps) => {
   const { t } = useTranslation('finance');
   const user = useCurrentUser();
   return (
      <InlineField
         className='justify-end text-right tabular-nums'
         format={(text) => (Number(text) ? format(Number(text)) : '—')}
         inputMode='decimal'
         kind='number'
         label={t('{{name}} за {{month}}', { name, month })}
         placeholder='—'
         validate={(text) =>
            !text.trim() || Number.isFinite(parseAmount(text))
               ? undefined
               : t('Укажите сумму: с минусом — расход')
         }
         value={value ? String(Math.round(value * 100) / 100) : ''}
         onSave={(text) =>
            finance.adjust(
               {
                  category,
                  month,
                  currency,
                  target: text.trim() ? parseAmount(text) : 0,
               },
               user.id,
            )
         }
      />
   );
};

export default AdjustCell;
