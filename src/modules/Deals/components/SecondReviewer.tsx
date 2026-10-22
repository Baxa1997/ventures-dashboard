import { FilterSelect } from '@shared/components';
import { SETTINGS_PATH, TEAM } from '@shared/constants';
import { shortName } from '@shared/helpers';
import type { Deal } from '@shared/types/deals.types';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import deals from '../services';

interface SecondReviewerProps {
   deal: Deal;
   disabled?: boolean;
   showLabel?: boolean; // write "Второй оценщик: …" rather than just the name
}

/* The fund's rule for screening: an employee other than the deal's owner
   confirms the decision. With nobody else in the team the rule cannot be met,
   so the place to invite someone is offered instead. */
const SecondReviewer = ({
   deal,
   disabled = false,
   showLabel = false,
}: SecondReviewerProps) => {
   const { t } = useTranslation('deals');
   const colleagues = TEAM.filter(({ id }) => id !== deal.ownerId);

   if (!colleagues.length)
      return (
         <p className='text-ink-soft text-xs'>
            {t('В команде пока нет другого сотрудника.')}{' '}
            <Link className='link' to={`${SETTINGS_PATH}/users`}>
               {t('Пригласить в Настройках')}
            </Link>
         </p>
      );

   return (
      <FilterSelect
         accent
         label={t('Второй оценщик')}
         options={[
            { value: '', label: t('не выбран') },
            ...colleagues.map(({ id, name }) => ({
               value: id,
               label: shortName(name),
            })),
         ]}
         showLabel={showLabel}
         value={deal.screening?.secondId ?? ''}
         onChange={(secondId) =>
            !disabled && deals.setScreening(deal.id, { secondId })
         }
      />
   );
};

export default SecondReviewer;
