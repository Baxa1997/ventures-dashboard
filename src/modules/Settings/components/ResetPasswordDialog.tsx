import settings from '@modules/Settings/services';
import { ConfirmDialog } from '@shared/components';
import { useCurrentUser } from '@shared/hooks';
import type {
   StaffCredentials,
   StaffMember,
} from '@shared/types/settings.types';
import { useTranslation } from 'react-i18next';

interface ResetPasswordDialogProps {
   member: StaffMember | null; // null: closed
   onClose: () => void;
   onDone: (credentials: StaffCredentials) => void; // what to hand over
}

/* A new password for somebody who has lost theirs, or to see what to hand over:
   ucode keeps only a password's hash, so the one they have cannot be read. */
const ResetPasswordDialog = ({
   member,
   onClose,
   onDone,
}: ResetPasswordDialogProps) => {
   const { t } = useTranslation('settings');
   const user = useCurrentUser();

   return (
      <ConfirmDialog
         confirmLabel={t('Выдать новый пароль')}
         error={t('Не удалось выдать новый пароль')}
         open={member !== null}
         subtitle={member?.name}
         success={t('Выдан новый пароль')}
         title={t('Выдать новый пароль?')}
         onClose={onClose}
         onConfirm={async () => {
            if (!member) return;
            onDone(
               await settings.resetPassword(
                  member,
                  user.id,
                  t('Новый пароль · {{name}}', { name: member.name }),
                  t('выдан'),
               ),
            );
         }}
      >
         <p>
            {t(
               'Текущий пароль перестанет работать. Посмотреть его нельзя: ucode хранит только зашифрованный след, поэтому выдаётся новый.',
            )}
         </p>
      </ConfirmDialog>
   );
};

export default ResetPasswordDialog;
