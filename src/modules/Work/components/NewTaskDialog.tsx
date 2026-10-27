import { Modal } from '@shared/components';
import { useAction } from '@shared/hooks';
import type { TaskInput } from '@shared/types/work.types';
import { useTranslation } from 'react-i18next';
import { closeNewTask, useNewTask, useTasks } from '../hooks';
import TaskForm from './TaskForm';

// The form, mounted while the dialog is open, so the tasks are read then.
const NewTask = () => {
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
         saving={saving.pending}
         targets={targets}
         onSubmit={saving.run}
      />
   );
};

// A new task over whatever page is open: the top bar's «+» and the
// dashboard's «Новая задача» open it, and the person stays where they were.
const NewTaskDialog = () => {
   const { t } = useTranslation('work');
   const open = useNewTask();

   return (
      <Modal
         open={open}
         size='wide'
         title={t('Новая задача')}
         onClose={closeNewTask}
      >
         {open && <NewTask />}
      </Modal>
   );
};

export default NewTaskDialog;
