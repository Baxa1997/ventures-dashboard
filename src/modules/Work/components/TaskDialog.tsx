import { Loading, Modal, NoData } from '@shared/components';
import { useAction } from '@shared/hooks';
import type { TaskInput } from '@shared/types/work.types';
import { useTranslation } from 'react-i18next';
import { targetNameOf } from '../helpers';
import { closeTaskDialog, useTaskDialog, useTasks } from '../hooks';
import type { NewTaskPreset } from '../hooks/useTaskDialog';
import TaskCard from './TaskCard';
import TaskCardHead from './TaskCardHead';
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
         closeTaskDialog();
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

interface OpenTaskProps {
   id: string;
}

// The top line of a task's card.
const OpenTaskHead = ({ id }: OpenTaskProps) => {
   const { tasks, targets, removeTask } = useTasks();
   const task = tasks.find((item) => item.id === id);
   if (!task) return null;

   return (
      <TaskCardHead
         target={targetNameOf(targets, task)}
         task={task}
         onRemove={async (taskId) => {
            await removeTask(taskId);
            closeTaskDialog();
         }}
      />
   );
};

// A task's card; a task that is gone says so.
const OpenTask = ({ id }: OpenTaskProps) => {
   const { t } = useTranslation('work');
   const { tasks, employees, targets, loading, ...actions } = useTasks();
   const task = tasks.find((item) => item.id === id);

   if (!task)
      return loading ? (
         <Loading />
      ) : (
         <NoData>{t('Задача не найдена — возможно, её уже удалили.')}</NoData>
      );

   return (
      <TaskCard
         key={task.id}
         employees={employees}
         targets={targets}
         task={task}
         {...actions}
      />
   );
};

// The task card over whatever page is open: a new task's form or a task's
// card, as useTaskDialog says.
const TaskDialog = () => {
   const { t } = useTranslation('work');
   const state = useTaskDialog();

   return (
      <Modal
         header={state?.kind === 'task' && <OpenTaskHead id={state.id} />}
         open={state !== null}
         size='card'
         title={state?.kind === 'task' ? t('Задача') : t('Новая задача')}
         onClose={closeTaskDialog}
      >
         {state?.kind === 'new' && <NewTask preset={state.preset} />}
         {state?.kind === 'task' && <OpenTask key={state.id} id={state.id} />}
      </Modal>
   );
};

export default TaskDialog;
