import { Avatar } from '@shared/components';
import { TEAM } from '@shared/constants';
import { shortName } from '@shared/helpers';

interface PersonProps {
   id: string;
   soft?: boolean; // the name in the softer ink
}

// An employee as lists show them: the initials and the short name.
const Person = ({ id, soft = false }: PersonProps) => {
   const employee = TEAM.find((item) => item.id === id);
   if (!employee) return <span className='text-ink-faint'>—</span>;

   return (
      <span className='flex items-center gap-2 whitespace-nowrap'>
         <Avatar name={employee.name} />
         <span className={soft ? 'text-ink-soft' : undefined}>
            {shortName(employee.name)}
         </span>
      </span>
   );
};

export default Person;
