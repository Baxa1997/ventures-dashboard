import {
   Button,
   Field,
   MODAL_FORM,
   Modal,
   ModalBody,
   ModalFooter,
} from '@shared/components';
import { addWorkingDays, todayISO } from '@shared/helpers';
import { useRequest } from '@shared/hooks';
import type { Deal } from '@shared/types/deals.types';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { COMPANY_MAX } from '../constants';
import deals from '../services';
import {
   fieldErrors,
   type ValidationKey,
   workstreamSchema,
} from '../validations';

// 'add': a new DD workstream; 'hand': hand one that has not started to its
// executor; 'conclude': record the conclusion of one in work, which closes it
export type WorkstreamMode = 'add' | 'hand' | 'conclude';

interface WorkstreamDialogProps {
   deal: Deal;
   mode: WorkstreamMode | null; // null: the dialog is closed
   onClose: () => void;
}

type Errors = Partial<Record<'name' | 'executor' | 'dueDate', ValidationKey>>;

// The workstreams whose executor can report.
export const concludable = (deal: Deal) =>
   (deal.workstreams ?? []).filter(
      ({ status }) => status === 'in_progress' || status === 'rework',
   );

const ConcludeForm = ({
   deal,
   onClose,
}: Omit<WorkstreamDialogProps, 'mode'>) => {
   const { t } = useTranslation('deals');
   const { t: tValidation } = useTranslation('validation');
   const streams = concludable(deal);
   const [streamId, setStreamId] = useState(streams[0]?.id ?? '');
   const [conclusion, setConclusion] = useState('');
   const [error, setError] = useState(false);
   const stream = streams.find(({ id }) => id === streamId);
   const accepting = useRequest({ success: t('Вывод принят') });

   const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!conclusion.trim()) {
         setError(true);
         return;
      }
      if (
         await accepting.run(() =>
            deals.concludeWorkstream(deal.id, streamId, conclusion.trim()),
         )
      )
         onClose();
   };

   return (
      <form noValidate className={MODAL_FORM} onSubmit={handleSubmit}>
         <ModalBody>
            <div className='grid gap-4'>
               <Field hint={stream?.executor} label={t('Направление')}>
                  <select
                     className='field-input'
                     value={streamId}
                     onChange={(event) => setStreamId(event.target.value)}
                  >
                     {streams.map(({ id, name }) => (
                        <option key={id} value={id}>
                           {name}
                        </option>
                     ))}
                  </select>
               </Field>
               <Field
                  error={error ? tValidation('Обязательное поле') : undefined}
                  hint={t(
                     'Главное из отчёта исполнителя: что подтвердилось и что нет',
                  )}
                  label={t('Вывод')}
               >
                  <textarea
                     data-autofocus
                     aria-invalid={error}
                     className='field-input field-sizing-content min-h-24 resize-none'
                     maxLength={600}
                     value={conclusion}
                     onChange={(event) => {
                        setConclusion(event.target.value);
                        setError(false);
                     }}
                  />
               </Field>
            </div>
         </ModalBody>
         <ModalFooter
            note={t('Направление закроется, а вывод уйдёт в готовность к ИК.')}
         >
            <Button variant='text' onClick={onClose}>
               {t('Отмена')}
            </Button>
            <Button loading={accepting.pending} type='submit'>
               {t('Принять вывод')}
            </Button>
         </ModalFooter>
      </form>
   );
};

const WorkstreamForm = ({
   deal,
   mode,
   onClose,
}: WorkstreamDialogProps & { mode: WorkstreamMode }) => {
   const { t } = useTranslation('deals');
   const { t: tValidation } = useTranslation('validation');
   const pending = (deal.workstreams ?? []).filter(
      ({ status }) => status === 'not_started',
   );
   const [streamId, setStreamId] = useState(pending[0]?.id ?? '');
   const stream = pending.find(({ id }) => id === streamId);
   const [values, setValues] = useState({
      name: '',
      executor: mode === 'hand' ? (pending[0]?.executor ?? '') : '',
      dueDate: addWorkingDays(todayISO(), 10),
   });
   const [errors, setErrors] = useState<Errors>({});
   const saving = useRequest(
      mode === 'hand'
         ? { success: t('Направление передано') }
         : { kind: 'create', success: t('Направление добавлено') },
   );

   const setValue = (key: keyof typeof values, value: string) => {
      setValues((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
   };

   const errorOf = (key: keyof Errors) => {
      const message = errors[key];
      return message && tValidation(message);
   };

   const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const result = workstreamSchema.safeParse(
         mode === 'hand' ? { ...values, name: stream?.name ?? '' } : values,
      );
      if (!result.success) {
         setErrors(fieldErrors(result.error));
         return;
      }
      const { data } = result;
      if (
         await saving.run(() =>
            mode === 'hand'
               ? deals.handOverWorkstream(deal.id, streamId, data.executor)
               : deals.addWorkstream(deal.id, data),
         )
      )
         onClose();
   };

   return (
      <form noValidate className={MODAL_FORM} onSubmit={handleSubmit}>
         <ModalBody>
            <div className='grid gap-4'>
               {mode === 'hand' ? (
                  <Field label={t('Направление')}>
                     <select
                        className='field-input'
                        value={streamId}
                        onChange={(event) => {
                           setStreamId(event.target.value);
                           setValue(
                              'executor',
                              pending.find(
                                 ({ id }) => id === event.target.value,
                              )?.executor ?? '',
                           );
                        }}
                     >
                        {pending.map(({ id, name }) => (
                           <option key={id} value={id}>
                              {name}
                           </option>
                        ))}
                     </select>
                  </Field>
               ) : (
                  <Field error={errorOf('name')} label={t('Направление')}>
                     <input
                        data-autofocus
                        aria-invalid={!!errors.name}
                        className='field-input'
                        maxLength={COMPANY_MAX}
                        value={values.name}
                        onChange={(event) =>
                           setValue('name', event.target.value)
                        }
                     />
                  </Field>
               )}
               <Field
                  error={errorOf('executor')}
                  hint={t('Кто проверяет и по какому договору')}
                  label={t('Исполнитель и основание')}
               >
                  <input
                     aria-invalid={!!errors.executor}
                     className='field-input'
                     maxLength={COMPANY_MAX * 2}
                     value={values.executor}
                     onChange={(event) =>
                        setValue('executor', event.target.value)
                     }
                  />
               </Field>
               {mode === 'add' && (
                  <Field error={errorOf('dueDate')} label={t('Срок')}>
                     <input
                        aria-invalid={!!errors.dueDate}
                        className='field-input sm:w-48'
                        type='date'
                        value={values.dueDate}
                        onChange={(event) =>
                           setValue('dueDate', event.target.value)
                        }
                     />
                  </Field>
               )}
            </div>
         </ModalBody>
         <ModalFooter>
            <Button variant='text' onClick={onClose}>
               {t('Отмена')}
            </Button>
            <Button loading={saving.pending} type='submit'>
               {mode === 'hand' ? t('Передать') : t('Добавить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

const WorkstreamDialog = ({ deal, mode, onClose }: WorkstreamDialogProps) => {
   const { t } = useTranslation('deals');

   return (
      <Modal
         open={mode !== null}
         subtitle={`${deal.company} · Due diligence`}
         title={
            mode === 'conclude'
               ? t('Принять вывод')
               : mode === 'hand'
                 ? t('Передать исполнителю')
                 : t('Добавить направление')
         }
         onClose={onClose}
      >
         {mode === 'conclude' && <ConcludeForm deal={deal} onClose={onClose} />}
         {mode && mode !== 'conclude' && (
            <WorkstreamForm
               key={mode}
               deal={deal}
               mode={mode}
               onClose={onClose}
            />
         )}
      </Modal>
   );
};

export default WorkstreamDialog;
