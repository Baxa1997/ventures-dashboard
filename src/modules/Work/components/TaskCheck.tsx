import { Checkbox } from '@shared/components';
import { useTranslation } from 'react-i18next';

interface TaskCheckProps {
   title: string;
   done: boolean;
   onToggle: () => void;
   busy?: boolean; // the tick is being saved
   action?: string; // what a click does, when it does not tick it at once
}

// Checkbox that marks a piece of work done or takes the mark back.
const TaskCheck = ({ title, done, onToggle, busy, action }: TaskCheckProps) => {
   const { t } = useTranslation('work');
   const label =
      action ?? (done ? t('Вернуть в работу') : t('Отметить выполненной'));

   return (
      <Checkbox
         busy={busy}
         checked={done}
         label={`${label}: ${title}`}
         onChange={onToggle}
      />
   );
};

export default TaskCheck;
