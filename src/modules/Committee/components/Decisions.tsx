import {
   BODY_LABELS,
   COMMITTEE_PATH,
   OUTCOMES,
} from '@modules/Committee/constants';
import type { CommitteeData } from '@modules/Committee/hooks';
import {
   Badge,
   Card,
   FilterBar,
   FilterSelect,
   NoData,
   SearchField,
   Table,
   TD,
   TH,
} from '@shared/components';
import { formatDayYear } from '@shared/helpers';
import type { CommitteeBody } from '@shared/types/committee.types';
import clsx from 'clsx';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

interface DecisionsProps {
   data: CommitteeData;
   meetingId?: string; // given: only that meeting's decisions, no filters
}

type BodyFilter = CommitteeBody | 'all';

// The decisions of the committee and the board, newest first: one meeting's
// on its page.
const Decisions = ({ data, meetingId }: DecisionsProps) => {
   const { t } = useTranslation('committee');
   const [search, setSearch] = useState('');
   const [body, setBody] = useState<BodyFilter>('all');
   const query = search.trim().toLowerCase();
   const rows = data.decisions
      .filter(
         (decision) =>
            (!meetingId || decision.meetingId === meetingId) &&
            (body === 'all' || decision.body === body) &&
            (!query ||
               `${decision.subject} ${decision.note}`
                  .toLowerCase()
                  .includes(query)),
      )
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

   return (
      <>
         {!meetingId && (
            <FilterBar>
               <SearchField
                  label={t('Компания или вопрос')}
                  value={search}
                  onChange={setSearch}
               />
               <FilterSelect
                  label={t('Орган')}
                  options={[
                     { value: 'all', label: t('все') },
                     { value: 'ic', label: t('Инвестиционный комитет') },
                     { value: 'board', label: t('Наблюдательный совет') },
                  ]}
                  value={body}
                  onChange={setBody}
               />
            </FilterBar>
         )}
         <Card
            className={clsx('flex flex-1 flex-col', !meetingId && 'mt-section')}
         >
            {rows.length ? (
               <Table
                  className='min-w-3xl'
                  head={
                     <>
                        <th className={TH}>{t('Заседание')}</th>
                        <th className={TH}>{t('Вопрос')}</th>
                        <th className={TH}>{t('Решение')}</th>
                        <th className={TH}>{t('Условия и примечания')}</th>
                     </>
                  }
               >
                  {rows.map((decision) => (
                     <tr key={decision.id}>
                        <td className={clsx(TD, 'whitespace-nowrap')}>
                           {decision.meetingId ? (
                              <Link
                                 className='text-sm font-semibold hover:underline'
                                 to={`${COMMITTEE_PATH}/${decision.meetingId}`}
                              >
                                 {decision.meetingLabel}
                              </Link>
                           ) : (
                              <span className='text-sm font-semibold'>
                                 {decision.meetingLabel}
                              </span>
                           )}
                           <div className='text-ink-soft mt-0.5 text-xs'>
                              {decision.date
                                 ? formatDayYear(decision.date)
                                 : t('до переноса реестра')}
                           </div>
                        </td>
                        <td className={TD}>
                           {decision.dealId ? (
                              <Link
                                 className='hover:underline'
                                 to={`/deals/${decision.dealId}`}
                              >
                                 {decision.subject}
                              </Link>
                           ) : (
                              decision.subject
                           )}
                           <div className='text-ink-soft mt-0.5 text-xs'>
                              {t(BODY_LABELS[decision.body])}
                           </div>
                        </td>
                        <td className={TD}>
                           <Badge tone={OUTCOMES[decision.outcome].tone}>
                              {t(OUTCOMES[decision.outcome].label)}
                           </Badge>
                        </td>
                        <td className={clsx(TD, 'text-ink-soft w-[32%]')}>
                           {decision.note || '—'}
                        </td>
                     </tr>
                  ))}
               </Table>
            ) : (
               <NoData>
                  {meetingId
                     ? t('Решения появятся, когда заседание примет их')
                     : t('Решений по этим условиям нет')}
               </NoData>
            )}
         </Card>
      </>
   );
};

export default Decisions;
