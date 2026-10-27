import { StatTile } from '@shared/components';
import { formatNumericDate } from '@shared/helpers';
import type { Dashboard } from '@shared/types/work.types';
import { Briefcase, Gavel, Handshake, ListChecks, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatMoneyShort } from '../helpers';

interface FiguresProps {
   board: Dashboard;
   myTasks: number;
   overdueTasks: number;
}

// The five headline figures: deals, the portfolio, the money invested, my
// open tasks and the committee's next meeting.
const Figures = ({ board, myTasks, overdueTasks }: FiguresProps) => {
   const { t } = useTranslation('work');
   const { deals, portfolio, nextMeeting } = board;

   return (
      <div className='gap-section stagger grid grid-cols-[repeat(auto-fit,minmax(10.625rem,1fr))]'>
         <StatTile
            color='sky'
            icon={Handshake}
            label={t('Сделки в работе')}
            note={t('{{count}} новая заявка', { count: deals.applications })}
            value={String(deals.inWork)}
         />
         <StatTile
            color='success'
            icon={Briefcase}
            label={t('Компании в портфеле')}
            note={t('{{count}} выход', { count: portfolio.exits })}
            value={String(portfolio.companies)}
         />
         <StatTile
            color='indigo'
            icon={Wallet}
            label={t('Вложено всего')}
            note={t('по закрытым сделкам')}
            value={formatMoneyShort(portfolio.invested)}
         />
         <StatTile
            color='warning'
            icon={ListChecks}
            label={t('Мои открытые задачи')}
            note={t('{{count}} просрочена', { count: overdueTasks })}
            value={String(myTasks)}
         />
         <StatTile
            color='info'
            icon={Gavel}
            label={t('Ближайший ИК')}
            note={
               nextMeeting
                  ? `№${nextMeeting.number} · ${t('{{count}} стартап', {
                       count: nextMeeting.deals,
                    })}`
                  : t('не назначен')
            }
            value={nextMeeting ? formatNumericDate(nextMeeting.date) : '—'}
         />
      </div>
   );
};

export default Figures;
