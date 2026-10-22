import { Card, NoData } from '@shared/components';
import { formatDayYear, personName } from '@shared/helpers';
import type { SettingsState } from '@shared/types/settings.types';
import { useTranslation } from 'react-i18next';

interface JournalProps {
   data: SettingsState;
}

// Every change of the rules and the lists: who, when, what it was and what it became.
const Journal = ({ data }: JournalProps) => {
   const { t } = useTranslation('settings');

   return (
      <Card className='flex flex-col'>
         {data.journal.length ? (
            <ol className='divide-line divide-y px-5'>
               {data.journal.map((change) => (
                  <li key={change.id} className='py-3'>
                     <div className='text-ink-soft text-xs'>
                        {formatDayYear(change.date)} ·{' '}
                        {personName(change.userId)}
                     </div>
                     <div className='mt-0.5 font-medium'>{change.field}</div>
                     <div className='mt-0.5'>
                        <span className='text-ink-soft line-through'>
                           {change.from || '—'}
                        </span>
                        {' → '}
                        {change.to || '—'}
                     </div>
                  </li>
               ))}
            </ol>
         ) : (
            <NoData>{t('Правила ещё не менялись')}</NoData>
         )}
      </Card>
   );
};

export default Journal;
