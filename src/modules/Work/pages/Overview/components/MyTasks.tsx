import { TaskLine } from '@modules/Work/components';
import type { Task } from '@shared/types/work.types';

interface MyTasksProps {
   tasks: Task[];
   targetName: (task: Task) => string;
   onTick: (task: Task) => Promise<unknown>;
}

// The signed-in person's open tasks, the nearest deadline first.
const MyTasks = ({ tasks, targetName, onTick }: MyTasksProps) => (
   <ul>
      {tasks.map((task) => (
         <TaskLine
            key={task.id}
            target={targetName(task)}
            task={task}
            onTick={onTick}
         />
      ))}
   </ul>
);

export default MyTasks;
