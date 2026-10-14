import { Badge } from '@shared/components';
import { useTranslation } from 'react-i18next';
import { daysUntil, dueTone, formatDate } from '../helpers';

interface DueBadgeProps {
   date: string; // YYYY-MM-DD
   withDays?: boolean; // say for how many days the deadline has been missed
}

// "Сегодня", "До 6 октября" or "Просрочено", coloured by how close the deadline is.
const DueBadge = ({ date, withDays = false }: DueBadgeProps) => {
   const { t } = useTranslation('work');
   const days = daysUntil(date);

   const label = () => {
      if (days === 0) return t('Сегодня');
      if (days > 0) return t('До {{date}}', { date: formatDate(date) });
      return withDays
         ? t('Просрочено {{count}} день', { count: -days })
         : t('Просрочено');
   };

   return <Badge tone={dueTone(date)}>{label()}</Badge>;
};

export default DueBadge;
