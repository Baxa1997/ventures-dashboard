import { Badge } from '@shared/components';
import type { TaskStatus } from '@shared/types/work.types';
import { useTranslation } from 'react-i18next';
import { statusColor, statusName, statusTone } from '../helpers';

interface StatusBadgeProps {
   status: TaskStatus;
}

// A task's status with its name and colour from Настройки → Статусы задач.
const StatusBadge = ({ status }: StatusBadgeProps) => {
   const { t } = useTranslation('work');
   return (
      <Badge color={statusColor(status)} tone={statusTone(status)}>
         {statusName(t, status)}
      </Badge>
   );
};

export default StatusBadge;
