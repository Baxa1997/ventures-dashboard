import { isDone } from '@modules/Work/helpers';
import { useTasks } from '@modules/Work/hooks';
import {
   Button,
   Card,
   Loading,
   Modal,
   NoData,
   PageBody,
   PageHeader,
} from '@shared/components';
import { useCurrentUser } from '@shared/hooks';
import type { Task, TaskInput } from '@shared/types/work.types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { Tabs, TaskDetail, TaskForm, TasksTable, Toolbar } from './components';
import { DEFAULT_TAB, type TaskTab } from './constants';
import { toTab } from './helpers';
import { useTaskFilters } from './hooks';

// null: the form is closed; { task }: editing that task; {}: creating one
type FormState = { task?: Task } | null;

/* The address keeps what is open, so a task can be linked to:
   ?tab=mine — the tab, ?task=<id> — the task in the card, ?new=1 — the form
   for a new task (the link "Новая задача" on other pages). */
const Tasks = () => {
   const { t } = useTranslation('work');
   const { t: tLayout } = useTranslation('layout');
   const user = useCurrentUser();
   const {
      tasks,
      employees,
      targets,
      loading,
      createTask,
      updateTask,
      removeTask,
      toggleChecklistItem,
      addComment,
   } = useTasks();
   const [params, setParams] = useSearchParams();
   const tab = toTab(params.get('tab'));
   const { filters, setFilter, visible, counts, summary } = useTaskFilters(
      tasks,
      tab,
      user.id,
   );
   const [form, setForm] = useState<FormState>(() =>
      params.has('new') ? {} : null,
   );
   // without a choice in the address, the card shows the first task of the list
   const selected =
      visible.find((task) => task.id === params.get('task')) ?? visible[0];

   // null removes the parameter
   const updateParams = (changes: Record<string, string | null>) =>
      setParams(
         (prev) => {
            const next = new URLSearchParams(prev);
            for (const [key, value] of Object.entries(changes)) {
               if (value === null) next.delete(key);
               else next.set(key, value);
            }
            return next;
         },
         { replace: true },
      );

   const tabParam = (next: TaskTab) => (next === DEFAULT_TAB ? null : next);

   const closeForm = () => {
      setForm(null);
      if (params.has('new')) updateParams({ new: null });
   };

   const handleSubmit = async (values: TaskInput) => {
      if (form?.task) {
         await updateTask(form.task.id, values);
         closeForm();
         return;
      }
      const created = await createTask(values);
      setForm(null);
      // show the new task wherever it landed
      updateParams({
         new: null,
         tab: tabParam(isDone(created) ? 'done' : 'open'),
         task: created.id,
      });
   };

   const content = () => {
      if (loading) return <Loading />;
      if (!visible.length) return <NoData>{t('Задач не найдено')}</NoData>;
      return (
         <TasksTable
            employees={employees}
            selectedId={selected?.id}
            tasks={visible}
            onSelect={(id) => updateParams({ task: id })}
         />
      );
   };

   return (
      <>
         <PageHeader
            section={tLayout('Работа')}
            title={t('Задачи')}
            meta={
               !loading &&
               [
                  t('Поручения команды фонда'),
                  t('{{count}} открытая', { count: summary.open }),
                  t('{{count}} просрочена', { count: summary.overdue }),
                  t('{{count}} не распределена', {
                     count: summary.unassigned,
                  }),
               ].join(' · ')
            }
            actions={
               <Button onClick={() => setForm({})}>{t('Новая задача')}</Button>
            }
         >
            <Tabs
               active={tab}
               counts={counts}
               onChange={(next) =>
                  updateParams({ tab: tabParam(next), task: null })
               }
            />
         </PageHeader>
         <PageBody className='flex flex-col'>
            <Toolbar
               employees={employees}
               filters={filters}
               onFilter={setFilter}
            />
            <div className='mt-section gap-section grid flex-1 xl:grid-cols-[minmax(0,1fr)_22.5rem]'>
               <Card className='overflow-hidden'>{content()}</Card>
               <div className='gap-section flex flex-col'>
                  {selected && (
                     <TaskDetail
                        key={selected.id}
                        employees={employees}
                        targets={targets}
                        task={selected}
                        onAdvance={(status) =>
                           updateTask(selected.id, { status })
                        }
                        onComment={(text) => addComment(selected.id, text)}
                        onDelete={() => removeTask(selected.id)}
                        onEdit={() => setForm({ task: selected })}
                        onToggleItem={(itemId) =>
                           toggleChecklistItem(selected.id, itemId)
                        }
                     />
                  )}
                  <div className='px-4'>
                     <h2 className='text-meta font-semibold'>
                        {t('Уведомления')}
                     </h2>
                     <p className='text-ink-soft mt-1 text-xs leading-4.25'>
                        {t(
                           'Письмо исполнителю в 09:00, если на неделе есть сроки; нет сроков — нет письма. Упоминание в комментарии приходит сразу. Задача без исполнителя уходит директору с пометкой «по умолчанию».',
                        )}
                     </p>
                  </div>
               </div>
            </div>
         </PageBody>
         <Modal
            open={form !== null}
            title={form?.task ? t('Редактирование задачи') : t('Новая задача')}
            onClose={closeForm}
         >
            {form && (
               <TaskForm
                  key={form.task?.id ?? 'new'}
                  employees={employees}
                  targets={targets}
                  task={form.task}
                  onCancel={closeForm}
                  onSubmit={handleSubmit}
               />
            )}
         </Modal>
      </>
   );
};

export default Tasks;
