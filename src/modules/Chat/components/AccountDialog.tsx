import {
   Button,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
   Notice,
   Spinner,
} from '@shared/components';
import { useAction } from '@shared/hooks';
import { CircleCheck, Smartphone } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import telegram, { useTelegram } from '../services/telegram';

interface AccountDialogProps {
   open: boolean;
   onClose: () => void;
}

const POLL_MS = 2000; // the server answers within seconds; a new QR every ~30 s

/* «Подключить аккаунт фонда», as Telegram Desktop links a device: a QR code
   the fund's phone scans in Telegram → Настройки → Устройства → Подключить
   устройство, and the two-step password if the account has one (encrypted
   here for the bot's server only). The window asks for the code as it opens;
   our Telegram app's keys are on the server, so nobody types them. */
const AccountDialog = ({ open, onClose }: AccountDialogProps) => {
   const { t } = useTranslation('chat');
   const state = useTelegram();
   const [password, setPassword] = useState('');
   const asked = useRef(false);
   const step = state?.auth.step ?? 'idle';
   const ready = !!state?.connected && !!state.app;

   const run = useAction((action: () => Promise<unknown>) => action(), {
      kind: 'send',
      success: false,
      error: t('Сервер бота не получил шаг: попробуйте ещё раз'),
   });

   // the QR code is asked for as the window opens, once
   useEffect(() => {
      if (!open) {
         asked.current = false;
         return;
      }
      if (ready && !asked.current) {
         asked.current = true;
         void run.run(() => telegram.startQr());
      }
   }, [open, ready]);

   // while the window is open, the server's answers and new codes come in
   useEffect(() => {
      if (!open) return;
      const timer = setInterval(() => void telegram.reload(), POLL_MS);
      return () => clearInterval(timer);
   }, [open]);

   const done = asked.current && step === 'done';
   const waiting =
      step === 'qr_start' ||
      step === 'qr_waiting' ||
      step === 'password' ||
      step === 'password_checking';

   const close = () => {
      // a linking left half way is dropped
      if (!done && step !== 'idle' && step !== 'error') void telegram.cancelLogin();
      setPassword('');
      onClose();
   };

   const submit = async (event: FormEvent) => {
      event.preventDefault();
      if (step === 'password_needed' && password)
         if (await run.run(() => telegram.sendPassword(password))) setPassword('');
   };

   return (
      <Modal
         open={open}
         size='md'
         subtitle={t('Аккаунт создаёт группы сделок и остаётся их владельцем')}
         title={t('Подключить аккаунт фонда')}
         onClose={close}
      >
         <form className={MODAL_FORM} onSubmit={submit}>
            <ModalBody>
               {!state?.connected ? (
                  <Notice warning>
                     {t('Сервер бота ещё не запущен: подключить аккаунт можно, когда он работает.')}
                  </Notice>
               ) : !state.app ? (
                  <Notice warning>
                     {t(
                        'На сервере бота ещё нет ключей приложения Telegram (api_id и api_hash с my.telegram.org). Их один раз добавляет разработчик, после этого здесь появится QR-код.',
                     )}
                  </Notice>
               ) : done ? (
                  <Notice icon={CircleCheck}>
                     {t(
                        'Аккаунт фонда подключён. Каждая новая сделка теперь сама открывает свою группу в Telegram; для уже открытых сделок группы открываются в разделе «Группы сделок» ниже.',
                     )}
                  </Notice>
               ) : step === 'password_needed' ? (
                  <div className='grid gap-4'>
                     {state.auth.error && <Notice warning>{state.auth.error}</Notice>}
                     <p className='text-ink-soft'>
                        {t(
                           'Код принят. На аккаунте включена двухэтапная проверка — введите её пароль: он шифруется в браузере и виден только серверу бота.',
                        )}
                     </p>
                     <Field
                        hint={
                           state.auth.hint
                              ? t('Подсказка: {{hint}}', { hint: state.auth.hint })
                              : undefined
                        }
                        label={t('Пароль двухэтапной проверки')}
                     >
                        <input
                           data-autofocus
                           autoComplete='current-password'
                           className='field-input h-9'
                           type='password'
                           value={password}
                           onChange={(event) => setPassword(event.target.value)}
                        />
                     </Field>
                  </div>
               ) : step === 'qr' && state.auth.qr ? (
                  <div className='grid items-center gap-5 sm:grid-cols-[15rem_minmax(0,1fr)]'>
                     <img
                        alt={t('QR-код для входа в аккаунт фонда')}
                        className='border-line mx-auto size-60 rounded-lg border bg-white p-2'
                        src={`data:image/svg+xml;utf8,${encodeURIComponent(state.auth.qr)}`}
                     />
                     <ol className='text-ink-soft grid list-decimal gap-2 pl-5'>
                        <li>
                           {t('Откройте Telegram на телефоне, где вошли в аккаунт фонда.')}
                        </li>
                        <li>
                           {t('Настройки → Устройства → «Подключить устройство».')}
                        </li>
                        <li>{t('Наведите камеру на этот код и подтвердите вход.')}</li>
                        <li className='text-ink-faint text-xs'>
                           {t('Код обновляется сам примерно раз в 30 секунд.')}
                        </li>
                     </ol>
                  </div>
               ) : step === 'error' && asked.current ? (
                  <Notice warning>{state.auth.error || t('Не удалось подключить аккаунт.')}</Notice>
               ) : waiting || asked.current ? (
                  <div className='text-ink-soft flex items-center gap-2 py-6'>
                     <Spinner />
                     {step === 'password' || step === 'password_checking'
                        ? t('Сервер бота проверяет пароль…')
                        : t('Готовим QR-код…')}
                  </div>
               ) : (
                  <Notice icon={Smartphone}>
                     {t('Нужен телефон, на котором открыт Telegram фонда.')}
                  </Notice>
               )}
            </ModalBody>
            <ModalFooter
               note={
                  ready && !done
                     ? t('Номер, коды и ключи вводить не нужно')
                     : undefined
               }
            >
               <Button
                  hint={t('Закрыть окно; начатое подключение отменяется')}
                  variant='text'
                  onClick={close}
               >
                  {done ? t('Готово') : t('Отмена')}
               </Button>
               {step === 'error' && asked.current && ready && (
                  <Button
                     hint={t('Показать новый QR-код')}
                     loading={run.pending}
                     onClick={() => void run.run(() => telegram.startQr())}
                  >
                     {t('Попробовать снова')}
                  </Button>
               )}
               {step === 'password_needed' && (
                  <Button
                     disabled={!password}
                     hint={t('Передать пароль серверу бота и войти в аккаунт')}
                     loading={run.pending}
                     type='submit'
                  >
                     {t('Войти')}
                  </Button>
               )}
            </ModalFooter>
         </form>
      </Modal>
   );
};

export default AccountDialog;
