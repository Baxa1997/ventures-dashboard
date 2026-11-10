import { InlineField } from '@shared/components';
import { useCurrentUser } from '@shared/hooks';
import type { FinCategory } from '@shared/types/finance.types';
import { ArrowUpRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { categoryName } from '../helpers';
import finance from '../services';

interface LineNameProps {
   category: FinCategory;
   link: string; // its operations in Транзакции
   linkHint: string;
   disabled: boolean;
}

/* A line item's name in P&L or Cash Flow, renamed where it stands in the
   panel's language, as the rest of the table (10 Nov); the arrow beside it
   opens its operations. */
const LineName = ({ category, link, linkHint, disabled }: LineNameProps) => {
   const { t, i18n } = useTranslation('finance');
   const user = useCurrentUser();
   const asked = i18n.resolvedLanguage ?? i18n.language;
   const language = (['ru', 'uz', 'en'] as const).find((one) => one === asked) ?? 'ru';
   return (
      <span className='flex min-w-0 items-center gap-1'>
         <InlineField
            className='min-w-0'
            disabled={disabled}
            label={t('Название статьи')}
            value={categoryName(category, language)}
            validate={(text) => (text.trim() ? undefined : t('Напишите название'))}
            onSave={(name) =>
               finance.saveCategory(
                  category.key,
                  { names: { ...category.names, [language]: name } },
                  user.id,
               )
            }
         />
         <Link
            aria-label={linkHint}
            className='text-ink-faint hover:text-accent hover:bg-hover grid size-6 shrink-0 place-items-center rounded-md'
            data-hint={linkHint}
            to={link}
         >
            <ArrowUpRight aria-hidden className='size-3.5' />
         </Link>
      </span>
   );
};

export default LineName;
