import { VOTE_ORDER, VOTES } from '@modules/Committee/constants';
import { BadgeSelect } from '@shared/components';
import type { VoteChoice } from '@shared/types/committee.types';
import { useTranslation } from 'react-i18next';

interface VoteSelectProps {
   label: string; // whose vote, for screen readers
   value: VoteChoice | null;
   onChange: (value: VoteChoice | null) => void;
}

// A member's vote as a badge the secretary changes in place.
const VoteSelect = ({ label, value, onChange }: VoteSelectProps) => {
   const { t } = useTranslation('committee');

   return (
      <BadgeSelect<VoteChoice | ''>
         label={label}
         options={[
            { value: '', label: t('Не голосовал'), tone: 'neutral' },
            ...VOTE_ORDER.map((choice) => ({
               value: choice,
               label: t(VOTES[choice].label),
               tone: VOTES[choice].tone,
            })),
         ]}
         value={value ?? ''}
         onChange={(choice) => onChange(choice || null)}
      />
   );
};

export default VoteSelect;
