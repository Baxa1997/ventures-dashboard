import { Modal } from '@shared/components';
import { useAction } from '@shared/hooks';
import type { TaskInput } from '@shared/types/work.types';
import { useTranslation } from 'react-i18next';
import { closeNewTask, useNewTask, useTasks } from '../hooks';
import type { NewTaskPreset } from '../hooks/useNewTask';
import TaskForm from './TaskForm';

interface NewTaskProps {
   preset: NewTaskPreset;
}

// The form, mounted while the dialog is open, so the tasks are read then.
const NewTask = ({ preset }: NewTaskProps) => {
   const { t } = useTranslation('work');
   const { employees, targets, createTask } = useTasks();
   const saving = useAction(
      async (values: TaskInput) => {
         await createTask(values);
         closeNewTask();
      },
      { kind: 'create', success: t('Задача создана') },
   );

   return (
      <TaskForm
         employees={employees}
         preset={preset}
         saving={saving.pending}
         targets={targets}
         onSubmit={saving.run}
      />
   );
};

// A new task over whatever page is open: the top bar's «+», the dashboard's
// «Новая задача» and Мой день's «Задача на сегодня» open it, and the person
// stays where they were.
const NewTaskDialog = () => {
   const { t } = useTranslation('work');
   const preset = useNewTask();

   return (
      <Modal
         open={preset !== null}
         size='wide'
         title={t('Новая задача')}
         onClose={closeNewTask}
      >
         {preset && <NewTask preset={preset} />}
      </Modal>
   );
};

export default NewTaskDialog;
