import { STATUS_GROUPS, TASK_STATUS_INFO } from '@modules/Settings/constants';
import { StatusBadge } from '@modules/Work/components';
import { Card, Table, TD, TH } from '@shared/components';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

/* The statuses of a task and what each means. They are fixed options, not a
   list: the tasks' logic depends on them — who closes a task, when a
   recurring one makes the next, what Мой день shows. ucode keeps them as a
   STATUS field with the same names and colours. */
const TaskStatuses = () => {
   const { t } = useTranslation('settings');

   return (
      <Card className='flex flex-col'>
         <Table
            className='min-w-xl'
            head={
               <>
                  <th className={TH}>{t('Статус')}</th>
                  <th className={TH}>{t('Группа')}</th>
                  <th className={TH}>{t('Что значит')}</th>
               </>
            }
         >
            {TASK_STATUS_INFO.map(({ status, group, text }) => (
               <tr key={status}>
                  <td className={clsx(TD, 'whitespace-nowrap')}>
                     <StatusBadge status={status} />
                  </td>
                  <td className={clsx(TD, 'text-ink-soft whitespace-nowrap')}>
                     {t(STATUS_GROUPS[group])}
                  </td>
                  <td className={TD}>{t(text)}</td>
               </tr>
            ))}
         </Table>
         <p className='text-ink-soft border-line mt-auto border-t px-5 py-3 text-xs'>
            {t(
               'Статусы фиксированы: от них зависит логика задач. Типы задач меняются в соседнем разделе.',
            )}
         </p>
      </Card>
   );
};

export default TaskStatuses;
