import logoWhite from '@assets/images/logo-white.png';
import { LOGIN_MAX, PASSWORD_MAX } from '@modules/Auth/constants';
import { UcodeError, ucodeConfigured } from '@shared/api/ucode';
import { Spinner } from '@shared/components';
import { OVERVIEW_PATH } from '@shared/constants';
import { signIn, useSession } from '@shared/hooks';
import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router';
import {
   getFieldErrors,
   type LoginErrors,
   loginSchema,
   type LoginValues,
} from './validations';

const INPUT =
   'border-brand-line bg-brand-ground text-brand-navy focus:border-brand-sky aria-invalid:border-danger w-full rounded-[10px] border px-3.5 py-3 text-base outline-0 focus:shadow-[0_0_0_3px_rgba(64,124,234,0.12)]';

interface FieldProps {
   label: string;
   error?: string;
   children: ReactNode;
}

const Field = ({ label, error, children }: FieldProps) => (
   <label className='text-brand-ink-soft grid gap-1.5 text-sm leading-normal font-medium'>
      {label}
      {children}
      {error && (
         <span role='alert' className='text-danger text-[13px]'>
            {error}
         </span>
      )}
   </label>
);

/* The sign-in page, in the brandbook's look rather than the platform's: it is
   the fund's front door. ucode checks the login (or work email) and password
   (@shared/api/ucode). A build without the ucode ids says so instead of
   letting anybody in. */
const Login = () => {
   const { t } = useTranslation('auth');
   const { t: tValidation } = useTranslation('validation');
   const session = useSession();
   const location = useLocation();
   const [values, setValues] = useState<LoginValues>({
      login: '',
      password: '',
   });
   const [remember, setRemember] = useState(true);
   const [errors, setErrors] = useState<LoginErrors>({});
   const [busy, setBusy] = useState(false);
   const [failure, setFailure] = useState('');
   const title = t('Вход');

   useEffect(() => {
      document.title = `${title} — SQB Ventures`;
   }, [title]);

   // after signing in, back to the page that asked for it
   if (session) {
      const from = (location.state as { from?: string } | null)?.from;
      return <Navigate replace to={from ?? OVERVIEW_PATH} />;
   }

   const setValue = (key: keyof LoginValues, value: string) => {
      setValues((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
      setFailure('');
   };

   const errorOf = (key: keyof LoginValues) => {
      const message = errors[key];
      return message && tValidation(message);
   };

   const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const result = loginSchema.safeParse(values);
      if (!result.success) {
         setErrors(getFieldErrors(result.error));
         return;
      }
      setBusy(true);
      try {
         await signIn(result.data.login, result.data.password, remember);
      } catch (error) {
         // ucode answers a wrong login or password with 400 or 404, a blocked user with 403
         const refused =
            error instanceof UcodeError &&
            error.status >= 400 &&
            error.status < 500;
         setFailure(
            refused
               ? t('Неверный логин или пароль')
               : t('Не удалось войти. Попробуйте ещё раз.'),
         );
      } finally {
         setBusy(false);
      }
   };

   return (
      <div className='bg-brand-ground font-brand text-brand-navy grid min-h-dvh leading-normal tracking-normal md:grid-cols-[1.1fr_1fr]'>
         <div className='brand-art hidden flex-col justify-between p-14 text-white md:flex'>
            <img
               src={logoWhite}
               alt='SQB Ventures'
               width={215}
               height={40}
               className='h-10 w-auto self-start'
            />
            <div>
               <h1 className='max-w-[14ch] text-[42px] leading-[1.12] font-bold tracking-[-0.01em]'>
                  {t('Сделки, дата-румы и контент сайта в одном месте')}
               </h1>
               <p className='mt-5 max-w-[42ch] text-[17px]'>
                  {t(
                     'Для инвестиционной команды, членов комитета и редакторов контента фонда.',
                  )}
               </p>
            </div>
            <div className='text-[13px]'>
               © {new Date().getFullYear()} SQB Ventures
            </div>
         </div>

         <main className='grid place-items-center p-8'>
            <form
               noValidate
               className='animate-rise grid w-full max-w-105 gap-5'
               onSubmit={handleSubmit}
            >
               <h2 className='mb-1 text-[28px] leading-tight font-bold tracking-[-0.01em]'>
                  {title}
               </h2>
               <Field
                  error={errorOf('login')}
                  label={t('Логин или рабочая почта')}
               >
                  <input
                     aria-invalid={!!errors.login}
                     autoCapitalize='none'
                     autoComplete='username'
                     className={INPUT}
                     maxLength={LOGIN_MAX}
                     spellCheck={false}
                     value={values.login}
                     onChange={(event) => setValue('login', event.target.value)}
                  />
               </Field>
               <Field error={errorOf('password')} label={t('Пароль')}>
                  <input
                     aria-invalid={!!errors.password}
                     autoComplete='current-password'
                     className={INPUT}
                     maxLength={PASSWORD_MAX}
                     type='password'
                     value={values.password}
                     onChange={(event) =>
                        setValue('password', event.target.value)
                     }
                  />
               </Field>
               <label className='text-brand-ink-soft flex items-center gap-2.5 text-[15px]'>
                  <input
                     checked={remember}
                     className='accent-brand-sky size-4.5'
                     type='checkbox'
                     onChange={(event) => setRemember(event.target.checked)}
                  />
                  {t('Не выходить на этом устройстве')}
               </label>
               {failure && (
                  <p role='alert' className='text-danger text-[15px]'>
                     {failure}
                  </p>
               )}
               {!ucodeConfigured && (
                  <p role='alert' className='text-danger text-[15px]'>
                     {t(
                        'Панель не подключена к ucode. Задайте VITE_UCODE_PROJECT_ID, VITE_UCODE_ENVIRONMENT_ID и VITE_UCODE_CLIENT_TYPE_IDS.',
                     )}
                  </p>
               )}
               <button
                  type='submit'
                  aria-busy={busy || undefined}
                  data-hint={t('Войти в панель с этим логином и паролем')}
                  disabled={busy || !ucodeConfigured}
                  className='bg-brand-sky hover:bg-brand-sky-deep focus-visible:outline-brand-sky inline-flex items-center justify-center gap-2 rounded-[10px] px-4 py-3.5 text-base font-bold text-white transition-colors disabled:opacity-70 aria-busy:cursor-progress'
               >
                  {busy && <Spinner />}
                  {busy ? t('Вход…') : t('Войти')}
               </button>
            </form>
         </main>
      </div>
   );
};

export default Login;
