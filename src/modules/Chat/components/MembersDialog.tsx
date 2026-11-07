import { Modal, ModalBody, NoData } from '@shared/components';
import { useTranslation } from 'react-i18next';
import { type ChatMember, fullName } from '../helpers';
import { MemberMark } from './ChatAvatar';

interface MembersDialogProps {
   open: boolean;
   chatName: string;
   members: ChatMember[];
   onClose: () => void;
}

// Who is in the group and what each of them does on the deal.
const MembersDialog = ({
   open,
   chatName,
   members,
   onClose,
}: MembersDialogProps) => {
   const { t } = useTranslation('chat');

   return (
      <Modal
         open={open}
         size='sm'
         subtitle={chatName}
         title={t('Участники группы')}
         onClose={onClose}
      >
         <ModalBody>
            {members.length ? (
               <ul className='grid gap-3'>
                  {members.map(({ id, roles }) => (
                     <li key={id} className='flex items-center gap-3'>
                        <MemberMark
                           className='size-9 text-xs'
                           name={fullName(id)}
                        />
                        <div className='min-w-0'>
                           <div className='truncate font-semibold'>
                              {fullName(id)}
                           </div>
                           <div className='text-ink-soft truncate text-xs'>
                              {roles.join(' · ') || t('Писал в группе')}
                           </div>
                        </div>
                     </li>
                  ))}
               </ul>
            ) : (
               <NoData>
                  {t(
                     'Участников пока нет: они появятся, когда у сделки будет владелец',
                  )}
               </NoData>
            )}
            <p className='text-ink-soft mt-4 text-xs'>
               {t(
                  'В группе — команда сделки, как её показывает карточка сделки: владелец, спонсор, второй оценщик и те, кого владелец добавил, а также все, кто писал в группе.',
               )}
            </p>
         </ModalBody>
      </Modal>
   );
};

export default MembersDialog;
