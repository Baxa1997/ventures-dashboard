import { SECTION_PATHS } from '@shared/constants';
import { formatDate } from '@shared/helpers';
import type { Deal } from '@shared/types/deals.types';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { committeeStateOf } from '../helpers';

interface CommitteeLinkProps {
   deal: Deal;
   onClick?: () => void;
}

// Where a deal waiting for the committee or the board is decided: the meeting
// it is on the agenda of, or a new meeting to put it on (also once a meeting
// has put the question off).
const CommitteeLink = ({ deal, onClick }: CommitteeLinkProps) => {
   const { t } = useTranslation('deals');

   if (!deal.committee || committeeStateOf(deal) === 'postponed')
      return (
         <Link
            className='link'
            data-hint={t('Выбрать дату и создать заседание для этой сделки')}
            to={`${SECTION_PATHS.committee}?schedule=${deal.id}`}
            onClick={onClick}
         >
            {t('Вынести на заседание')}
         </Link>
      );
   const values = {
      number: deal.committee.number,
      date: formatDate(deal.committee.date),
   };
   return (
      <Link
         className='link'
         data-hint={t('Открыть заседание, где решается эта сделка')}
         to={`${SECTION_PATHS.committee}/${deal.committee.id}`}
         onClick={onClick}
      >
         {deal.stage === 'board'
            ? t('Открыть НС № {{number}} · {{date}}', values)
            : t('Открыть ИК № {{number}} · {{date}}', values)}
      </Link>
   );
};

export default CommitteeLink;
