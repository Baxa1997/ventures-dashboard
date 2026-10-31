import {
   Button,
   Field,
   Modal,
   ModalBody,
   ModalFooter,
   Notice,
} from '@shared/components';
import { toast } from '@shared/helpers/toast';
import type { StaffCredentials } from '@shared/types/settings.types';
import { Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CredentialsDialogProps {
   credentials: StaffCredentials | null; // null: closed
   onClose: () => void;
}

/* What a new person signs in with, for the director to hand over, since the
   panel sends no letters yet. The password is not kept anywhere: closed, it
   cannot be shown again. */
const CredentialsDialog = ({
   credentials,
   onClose,
}: CredentialsDialogProps) => {
   const { t } = useTranslation('settings');
   const address = window.location.origin;

   const copy = async () => {
      if (!credentials) return;
      await navigator.clipboard.writeText(
         `${address}\n${credentials.login}\n${credentials.password}`,
      );
      toast.success(t('Скопировано'));
   };

   return (
      <Modal
         open={credentials !== null}
         title={t('Данные для входа')}
         onClose={onClose}
      >
         {credentials && (
            <>
               <ModalBody>
                  <div className='grid gap-4'>
                     <Notice warning>
                        {t(
                           'Передайте их сотруднику. Пароль показывается один раз: после закрытия окна его не увидеть, но можно выдать новый.',
                        )}
                     </Notice>
                     <Field label={t('Адрес панели')}>
                        <input
                           readOnly
                           className='field-input'
                           value={address}
                        />
                     </Field>
                     <Field label={t('Логин')}>
                        <input
                           readOnly
                           className='field-input'
                           value={credentials.login}
                        />
                     </Field>
                     <Field label={t('Пароль')}>
                        <input
                           readOnly
                           className='field-input font-mono'
                           value={credentials.password}
                        />
                     </Field>
                  </div>
               </ModalBody>
               <ModalFooter>
                  <Button
                     hint={t(
                        'Скопировать логин и пароль, чтобы передать сотруднику',
                     )}
                     variant='ghost'
                     onClick={copy}
                  >
                     <Copy aria-hidden />
                     {t('Скопировать')}
                  </Button>
                  <Button
                     hint={t('Закрыть окно: пароль больше не будет показан')}
                     onClick={onClose}
                  >
                     {t('Готово')}
                  </Button>
               </ModalFooter>
            </>
         )}
      </Modal>
   );
};

export default CredentialsDialog;
