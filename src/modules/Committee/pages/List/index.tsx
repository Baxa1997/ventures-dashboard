import ScheduleDialog from '@modules/Committee/components/ScheduleDialog';
import {
   COMMITTEE_PATH,
   IC_RULES,
   LIST_TAB_LABELS,
   LIST_TABS,
   type ListTab,
} from '@modules/Committee/constants';
import { useCommittee } from '@modules/Committee/hooks';
import {
   Button,
   Loading,
   PageBody,
   PageHeader,
   Tabs,
} from '@shared/components';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';
import { Board, Decisions, Meetings, Members } from './components';

const toTab = (value: string | null): ListTab =>
   LIST_TABS.find((tab) => tab === value) ?? 'meetings';

/* Инвесткомитет и наблюдательный совет: the committee's meetings, the board,
   the register of decisions and who sits on the committee. The address keeps
   the tab (?tab=decisions). */
const CommitteeList = () => {
   const { t } = useTranslation('committee');
   const { t: tLayout } = useTranslation('layout');
   const navigate = useNavigate();
   const data = useCommittee();
   const [params, setParams] = useSearchParams();
   const tab = toTab(params.get('tab'));
   const [scheduling, setScheduling] = useState(false);
   const title = t('Инвесткомитет и наблюдательный совет');

   if (!data)
      return (
         <>
            <PageHeader section={tLayout('Инвестиции')} title={title} />
            <Loading />
         </>
      );

   const counts: Record<ListTab, number> = {
      meetings: data.totals.meetings,
      board: data.meetings.filter(({ body }) => body === 'board').length,
      decisions: data.totals.decisions,
      members: data.members.length,
   };

   return (
      <>
         <PageHeader
            actions={
               <Button onClick={() => setScheduling(true)}>
                  {t('Назначить заседание')}
               </Button>
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
         >
            <Tabs
               active={tab}
               items={LIST_TABS.map((id) => ({
                  id,
                  label: t(LIST_TAB_LABELS[id]),
                  count: counts[id],
               }))}
               label={title}
               onChange={(next) =>
                  setParams(next === 'meetings' ? {} : { tab: next }, {
                     replace: true,
                  })
               }
            />
         </PageHeader>
         <PageBody className='flex flex-col'>
            {tab === 'meetings' && <Meetings data={data} />}
            {tab === 'board' && <Board data={data} />}
            {tab === 'decisions' && <Decisions data={data} />}
            {tab === 'members' && <Members data={data} />}
         </PageBody>
         <ScheduleDialog
            data={data}
            open={scheduling}
            onClose={() => setScheduling(false)}
            onScheduled={(meeting) =>
               navigate(`${COMMITTEE_PATH}/${meeting.id}`)
            }
         />
      </>
   );
};

export default CommitteeList;
