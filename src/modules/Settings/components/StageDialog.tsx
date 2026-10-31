import { ESCALATION_LABELS } from '@modules/Settings/constants';
import { describeStage } from '@modules/Settings/helpers';
import settings, { stageName, stagesOf } from '@modules/Settings/services';
import {
   Button,
   Checkbox,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { toLatin } from '@shared/helpers';
import { useAction, useCurrentUser } from '@shared/hooks';
import type { EscalateTo, StageInput } from '@shared/types/settings.types';
import type { SupportedLanguageType } from '@shared/types/system/language.types';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface StageDialogProps {
   open: boolean;
   onClose: () => void;
}

const LANGUAGES = [
   ['ru', 'Название (рус.)'],
   ['uz', 'Название (узб.)'],
   ['en', 'Название (англ.)'],
] as const satisfies readonly (readonly [SupportedLanguageType, string])[];

const KEY = /^[a-z0-9]+(_[a-z0-9]+)*$/;

const keyFrom = (name: string) =>
   toLatin(name.trim())
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

const ESCALATIONS = Object.keys(ESCALATION_LABELS) as EscalateTo[];

const StageForm = ({ onClose }: Omit<StageDialogProps, 'open'>) => {
   const { t } = useTranslation('settings');
   const user = useCurrentUser();
   const stages = stagesOf();
   const [value, setValue] = useState<StageInput>({
      key: '',
      names: { ru: '', uz: '', en: '' },
      norm: '',
      paused: '',
      escalation: 'deputy',
      isPublic: false,
   });
   // a new stage goes before ИК-1 if there is one, else last ('' — first)
   const [after, setAfter] = useState(() => {
      const ic1 = stages.findIndex(({ key }) => key === 'ic1');
      return stages[ic1 > 0 ? ic1 - 1 : stages.length - 1]?.key ?? '';
   });
   const [keyTyped, setKeyTyped] = useState(false);
   const [tried, setTried] = useState(false);

   const errors = {
      ru: value.names.ru.trim() ? '' : t('Укажите название'),
      key: !value.key
         ? t('Укажите код')
         : !KEY.test(value.key)
           ? t('Код пишется так: {{hint}}', {
                hint: t('латиницей через подчёркивание: legal_check'),
             })
           : stages.some(({ key }) => key === value.key)
             ? t('Такой код уже есть')
             : '',
   };

   const save = useAction(
      async () => {
         const next: StageInput = {
            ...value,
            names: {
               ru: value.names.ru.trim(),
               uz: value.names.uz.trim(),
               en: value.names.en.trim(),
            },
            norm: value.norm.trim(),
            paused: value.paused.trim(),
         };
         await settings.saveStage(
            null,
            next.key,
            next,
            after,
            user.id,
            t('Этап «{{name}}»', { name: next.names.ru }),
            (row) => describeStage(t, row),
         );
      },
      { kind: 'create' },
   );

   const submit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setTried(true);
      if (!errors.ru && !errors.key && (await save.run())) onClose();
   };

   return (
      <form noValidate className={MODAL_FORM} onSubmit={submit}>
         <ModalBody>
            <div className='grid gap-4 sm:grid-cols-2'>
               {LANGUAGES.map(([language, label], index) => (
                  <Field
                     key={language}
                     className={index === 0 ? 'sm:col-span-2' : undefined}
                     error={language === 'ru' && tried ? errors.ru : undefined}
                     label={t(label)}
                  >
                     <input
                        aria-invalid={language === 'ru' && tried && !!errors.ru}
                        className='field-input'
                        data-autofocus={index === 0 || undefined}
                        maxLength={60}
                        value={value.names[language]}
                        onChange={(event) =>
                           setValue((prev) => {
                              const names = {
                                 ...prev.names,
                                 [language]: event.target.value,
                              };
                              // the code follows the English name, or the
                              // Russian one while there is no English
                              return {
                                 ...prev,
                                 names,
                                 ...(!keyTyped && {
                                    key: keyFrom(names.en || names.ru),
                                 }),
                              };
                           })
                        }
                     />
                  </Field>
               ))}
               <Field
                  error={tried ? errors.key : undefined}
                  hint={t('латиницей через подчёркивание: legal_check')}
                  label={t('Код')}
               >
                  <input
                     aria-invalid={tried && !!errors.key}
                     className='field-input font-mono'
                     maxLength={40}
                     value={value.key}
                     onChange={(event) => {
                        setKeyTyped(true);
                        setValue((prev) => ({
                           ...prev,
                           key: event.target.value,
                        }));
                     }}
                  />
               </Field>
               <Field label={t('Поставить после')}>
                  <select
                     className='field-input'
                     value={after}
                     onChange={(event) => setAfter(event.target.value)}
                  >
                     <option value=''>{t('В начало списка')}</option>
                     {stages.map(({ key }) => (
                        <option key={key} value={key}>
                           {stageName(key)}
                        </option>
                     ))}
                  </select>
               </Field>
               <Field
                  hint={t('рабочих дней, можно с пометкой: «5 · публично»')}
                  label={t('Норма')}
               >
                  <input
                     className='field-input'
                     maxLength={40}
                     value={value.norm}
                     onChange={(event) =>
                        setValue((prev) => ({
                           ...prev,
                           norm: event.target.value,
                        }))
                     }
                  />
               </Field>
               <Field label={t('Эскалация')}>
                  <select
                     className='field-input'
                     value={value.escalation}
                     onChange={(event) =>
                        setValue((prev) => ({
                           ...prev,
                           escalation: event.target.value as EscalateTo,
                        }))
                     }
                  >
                     {ESCALATIONS.map((escalation) => (
                        <option key={escalation} value={escalation}>
                           {t(ESCALATION_LABELS[escalation])}
                        </option>
                     ))}
                  </select>
               </Field>
               <Field
                  className='sm:col-span-2'
                  hint={t('например, «ждём ответа заявителя»')}
                  label={t('Часы стоят, когда')}
               >
                  <input
                     className='field-input'
                     maxLength={120}
                     value={value.paused}
                     onChange={(event) =>
                        setValue((prev) => ({
                           ...prev,
                           paused: event.target.value,
                        }))
                     }
                  />
               </Field>
               <label className='flex items-center gap-2.5 sm:col-span-2'>
                  <Checkbox
                     checked={value.isPublic}
                     label={t('Норма видна основателю')}
                     onChange={() =>
                        setValue((prev) => ({
                           ...prev,
                           isPublic: !prev.isPublic,
                        }))
                     }
                  />
                  {t('Норма видна основателю')}
               </label>
            </div>
         </ModalBody>
         <ModalFooter note={t('Изменение попадёт в журнал')}>
            <Button
               hint={t('Закрыть окно, ничего не меняя')}
               variant='text'
               onClick={onClose}
            >
               {t('Отмена')}
            </Button>
            <Button
               hint={t('Добавить этап в путь сделки')}
               loading={save.pending}
               type='submit'
            >
               {t('Добавить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

/* A stage of the fund's own, added by the director where it goes; the
   stages are changed in the list itself. */
const StageDialog = ({ open, onClose }: StageDialogProps) => {
   const { t } = useTranslation('settings');

   return (
      <Modal
         open={open}
         subtitle={t('Этапы сделки')}
         title={t('Новый этап')}
         onClose={onClose}
      >
         {open && <StageForm onClose={onClose} />}
      </Modal>
   );
};

export default StageDialog;
