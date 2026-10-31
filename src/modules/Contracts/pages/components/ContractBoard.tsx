import { CONTRACT_STATUSES, STATUS_INFO } from '@modules/Contracts/constants';
import { isEnding, typeColor } from '@modules/Contracts/helpers';
import { listName } from '@modules/Settings/services';
import { Avatar, Badge, KanbanBoard, TONE_COLORS } from '@shared/components';
import {
   formatMoneyShort,
   formatNumericDate,
   personName,
   shortName,
} from '@shared/helpers';
import type { Contract, ContractStatus } from '@shared/types/contracts.types';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

interface ContractBoardProps {
   contracts: Contract[];
   only: ContractStatus | ''; // the status filter leaves its own column
   onOpen: (contract: Contract) => void;
   onMove: (contract: Contract, status: ContractStatus) => void;
}

// What a card shows: number and type, the other side, the subject, the sum
// and date, who runs it and who approves it.
const CardFace = ({ contract }: { contract: Contract }) => {
   const { t } = useTranslation('contracts');
   const owner = personName(contract.ownerId);
   const date = contract.validUntil
      ? t('до {{date}}', { date: formatNumericDate(contract.validUntil) })
      : contract.signedDate
        ? formatNumericDate(contract.signedDate)
        : '';

   return (
      <>
         <div className='flex items-center justify-between gap-2'>
            <b className='truncate tabular-nums'>{contract.number}</b>
            <Badge color={typeColor(contract.type)} tone='neutral'>
               {listName('contractTypes', contract.type)}
            </Badge>
         </div>
         <span className='font-semibold'>{contract.party}</span>
         <span className='text-ink-faint text-xs'>{contract.subject}</span>
         <div className='text-ink-faint flex justify-between gap-2 text-xs'>
            <span>
               {contract.amount ? formatMoneyShort(contract.amount) : '—'}
            </span>
            <span className={clsx(isEnding(contract) && 'text-danger')}>
               {date}
            </span>
         </div>
         <div className='text-ink-faint flex items-center gap-1.5 text-xs'>
            <Avatar name={owner} />
            <span className='truncate'>{owner}</span>
            {contract.approverId && contract.status === 'approval' && (
               <span className='truncate'>
                  {t('· согласует {{name}}', {
                     name: shortName(personName(contract.approverId)),
                  })}
               </span>
            )}
         </div>
      </>
   );
};

// «Канбан»: a column per status; a card carried to another takes its status.
const ContractBoard = ({
   contracts,
   only,
   onOpen,
   onMove,
}: ContractBoardProps) => {
   const { t } = useTranslation('contracts');

   return (
      <>
         <KanbanBoard
            columnOf={({ status }) => status}
            columns={CONTRACT_STATUSES.filter(
               (status) => !only || status === only,
            ).map((status) => ({
               id: status,
               label: t(STATUS_INFO[status].label),
               color: TONE_COLORS[STATUS_INFO[status].tone],
               aside: String(
                  contracts.filter((item) => item.status === status).length,
               ),
            }))}
            idOf={({ id }) => id}
            items={contracts}
            nameOf={({ number, party }) => `${number} ${party}`}
            renderCard={(contract) => <CardFace contract={contract} />}
            onMove={(contract, column) =>
               onMove(contract, column as ContractStatus)
            }
            onOpen={onOpen}
         />
         <p className='text-ink-soft mt-2.5 text-xs'>
            {t(
               'Перетащите карточку в другую колонку, чтобы сменить статус. «На согласовании» попадает в «Мой день» согласующего.',
            )}
         </p>
      </>
   );
};

export default ContractBoard;
