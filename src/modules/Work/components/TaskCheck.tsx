import { Checkbox } from '@shared/components';
import { useTranslation } from 'react-i18next';

interface TaskCheckProps {
   title: string;
   done: boolean;
   onToggle: () => void;
   busy?: boolean; // the tick is being saved
}

// Checkbox that marks a piece of work done or takes the mark back.
const TaskCheck = ({ title, done, onToggle, busy }: TaskCheckProps) => {
   const { t } = useTranslation('work');
   const action = done ? t('Вернуть в работу') : t('Отметить выполненной');

   return (
      <Checkbox
         busy={busy}
         checked={done}
         label={`${action}: ${title}`}
         onChange={onToggle}
      />
   );
};

export default TaskCheck;
