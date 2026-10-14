import { Checkbox } from '@shared/components';
import { useTranslation } from 'react-i18next';

interface TaskCheckProps {
   title: string;
   done: boolean;
   onToggle: () => void;
}

// Checkbox that marks a piece of work done or takes the mark back.
const TaskCheck = ({ title, done, onToggle }: TaskCheckProps) => {
   const { t } = useTranslation('work');
   const action = done ? t('Вернуть в работу') : t('Отметить выполненной');

   return (
      <Checkbox
         checked={done}
         label={`${action}: ${title}`}
         onChange={onToggle}
      />
   );
};

export default TaskCheck;
