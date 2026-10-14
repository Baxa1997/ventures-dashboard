import { COMMITTEE_PATH, RESULTS } from '@modules/Committee/constants';
import { meetingName } from '@modules/Committee/helpers';
import type { CommitteeData } from '@modules/Committee/hooks';
import { Badge, Card, NoData, Table, TD, TH } from '@shared/components';
import { formatDayYear } from '@shared/helpers';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

interface BoardProps {
   data: CommitteeData;
}

// The supervisory board's meetings. A deal goes to the board after ИК-2; the
// money moves only once the board has approved it too.
const Board = ({ data }: BoardProps) => {
   const { t } = useTranslation('committee');
   const navigate = useNavigate();
   const meetings = data.meetings
      .filter(({ body }) => body === 'board')
      .sort((a, b) => b.date.localeCompare(a.date));

   return (
      <>
         <Card className='flex-1' title={t('Заседания наблюдательного совета')}>
            {meetings.length ? (
               <Table
                  className='min-w-2xl'
                  head={
                     <>
                        <th className={TH}>{t('Заседание')}</th>
                        <th className={TH}>{t('Вопросы')}</th>
                        <th className={TH}>{t('Решение')}</th>
                        <th className={TH}>{t('Протокол')}</th>
                     </>
                  }
               >
                  {meetings.map((meeting) => (
                     <tr
                        key={meeting.id}
                        className='hover:bg-ground/60 cursor-pointer'
                        onClick={() =>
                           navigate(`${COMMITTEE_PATH}/${meeting.id}`)
                        }
                     >
                        <td className={clsx(TD, 'whitespace-nowrap')}>
                           <div className='text-sm font-semibold'>
                              {meetingName(t, meeting)}
                           </div>
                           <div className='text-ink-soft mt-0.5 text-xs'>
                              {formatDayYear(meeting.date)}
                           </div>
                        </td>
                        <td className={TD}>{meeting.summary}</td>
                        <td className={TD}>
                           <Badge tone={RESULTS[meeting.result].tone}>
                              {t(RESULTS[meeting.result].label)}
                           </Badge>
                        </td>
                        <td className={clsx(TD, 'text-ink-soft')}>
                           {meeting.protocol === 'signed'
                              ? t('Подписан')
                              : meeting.protocol === 'signing'
                                ? t('На подписи')
                                : '—'}
                        </td>
                     </tr>
                  ))}
               </Table>
            ) : (
               <NoData>
                  {t('Заседаний наблюдательного совета ещё не было')}
               </NoData>
            )}
         </Card>
         <p className='text-ink-soft mt-section text-xs'>
            {t(
               'Сделка выходит на наблюдательный совет после ИК-2. Платёж по сделке уходит только после решений ИК и НС — их видно в «Финансах».',
            )}
         </p>
      </>
   );
};

export default Board;
