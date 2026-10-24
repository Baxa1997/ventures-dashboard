import ScheduleDialog from '@modules/Committee/components/ScheduleDialog';
import { COMMITTEE_PATH, IC_RULES } from '@modules/Committee/constants';
import { useCommittee } from '@modules/Committee/hooks';
import {
   Button,
   buttonClass,
   Loading,
   PageBody,
   PageHeader,
} from '@shared/components';
import { SETTINGS_PATH } from '@shared/constants';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Meetings } from './components';

/* Инвесткомитет и наблюдательный совет: the meetings of the committee and
   the board in one list, the next one with its agenda and who will come,
   and the decisions still to be carried out. A meeting's own page has its
   participants and its decisions. A deal's card opens a new meeting for the
   deal with ?schedule=<deal id>. */
const CommitteeList = () => {
   const { t } = useTranslation('committee');
   const { t: tLayout } = useTranslation('layout');
   const navigate = useNavigate();
   const data = useCommittee();
   const [params, setParams] = useSearchParams();
   const scheduleFor = params.get('schedule') ?? undefined;
   const [scheduling, setScheduling] = useState(false);
   const title = t('Инвесткомитет и наблюдательный совет');

   if (!data)
      return (
         <>
            <PageHeader section={tLayout('Инвестиции')} title={title} />
            <Loading />
         </>
      );

   return (
      <>
         <PageHeader
            actions={
               <>
                  {/* the rules the panel applies: quorum, materials, votes */}
                  <Link
                     className={buttonClass('ghost')}
                     to={`${SETTINGS_PATH}/committee`}
                  >
                     {t('Положение об ИК')}
                  </Link>
                  <Button onClick={() => setScheduling(true)}>
                     {t('Назначить заседание')}
                  </Button>
               </>
            }
            meta={[
               t('Кворум ИК — {{count}} член', { count: IC_RULES.quorum }),
               t('материалы рассылаются за {{count}} рабочий день', {
                  count: IC_RULES.materialsDays,
               }),
               t('правила голосования из «Чек-лист ИК»'),
            ].join(' · ')}
            section={tLayout('Инвестиции')}
            title={title}
         />
         <PageBody className='flex flex-col'>
            <Meetings data={data} onSchedule={() => setScheduling(true)} />
         </PageBody>
         <ScheduleDialog
            data={data}
            dealId={scheduleFor}
            open={scheduling || !!scheduleFor}
            onClose={() => {
               setScheduling(false);
               if (scheduleFor) setParams({}, { replace: true });
            }}
            onScheduled={(meeting) =>
               navigate(`${COMMITTEE_PATH}/${meeting.id}`)
            }
         />
      </>
   );
};

export default CommitteeList;
