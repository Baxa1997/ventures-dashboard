import { TITLE_MAX } from '@modules/Work/constants';
import { Spinner } from '@shared/components';
import { useAction } from '@shared/hooks';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface QuickAddProps {
   onAdd: (title: string) => Promise<unknown>;
}

// «Быстро добавить»: the title and Enter make a task of one's own for today.
const QuickAdd = ({ onAdd }: QuickAddProps) => {
   const { t } = useTranslation('work');
   const [title, setTitle] = useState('');
   const adding = useAction(onAdd, {
      kind: 'create',
      success: t('Задача создана'),
   });

   return (
      <form
         className='border-line flex items-center gap-3 border-b px-4.5 py-2.5'
         onSubmit={async (event) => {
            event.preventDefault();
            const value = title.trim();
            if (value && (await adding.run(value))) setTitle('');
         }}
      >
         {adding.pending ? (
            <Spinner className='text-ink-faint size-4 shrink-0' />
         ) : (
            <Plus aria-hidden className='text-ink-faint size-4 shrink-0' />
         )}
         <input
            aria-label={t('Новая задача на сегодня')}
            className='placeholder:text-ink-faint min-w-0 flex-1 bg-transparent py-1 outline-none'
            maxLength={TITLE_MAX}
            placeholder={t('Быстро добавить задачу на сегодня и нажать Enter')}
            readOnly={adding.pending}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
         />
      </form>
   );
};

export default QuickAdd;
