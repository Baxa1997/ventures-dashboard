import { Badge, type BadgeTone } from '@shared/components';
import type { TaskStatus } from '@shared/types/work.types';
import { useTranslation } from 'react-i18next';
import { TASK_STATUS_LABELS } from '../constants';

interface StatusBadgeProps {
   status: TaskStatus;
}

const TONES: Record<TaskStatus, BadgeTone> = {
   assigned: 'neutral',
   in_progress: 'accent',
   waiting: 'warning',
   review: 'accent',
   postponed: 'neutral',
   done: 'success',
};

const StatusBadge = ({ status }: StatusBadgeProps) => {
   const { t } = useTranslation('work');
   return <Badge tone={TONES[status]}>{t(TASK_STATUS_LABELS[status])}</Badge>;
};

export default StatusBadge;
