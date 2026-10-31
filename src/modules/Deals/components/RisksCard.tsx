import {
   Button,
   Card,
   ConfirmDialog,
   Field,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
   NoData,
} from '@shared/components';
import { TEAM } from '@shared/constants';
import { newId, shortName } from '@shared/helpers';
import { useAction } from '@shared/hooks';
import type { Deal, Risk } from '@shared/types/deals.types';
import { type FormEvent, type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RISK_LEVEL_LABELS } from '../constants';
import deals from '../services';
import RiskList from './RiskList';

interface RisksCardProps {
   deal: Deal;
   editable: boolean;
   title: string;
   link?: ReactNode; // where the risks are looked at further
}

/* The deal's open risks, from DD: each with how grave it is and who owns it.
   The owner adds a risk, changes one, and deletes it once it is dealt
   with. A risk given a severity also goes into the memorandum's
   matrix. */
const RisksCard = ({ deal, editable, title, link }: RisksCardProps) => {
   const { t } = useTranslation('deals');
   // null: closed; a risk without a title is a new one
   const [open, setOpen] = useState<Risk | null>(null);
   const [removing, setRemoving] = useState<Risk | null>(null);
   const risks = deal.risks ?? [];

   const add = () =>
      setOpen({
         id: newId(),
         level: 'medium',
         title: '',
         note: '',
         ownerId: '',
      });

   return (
      <Card
         action={
            (editable || link) && (
               <span className='flex gap-4'>
                  {editable && (
                     <button
                        type='button'
                        className='link'
                        data-hint={t('Добавить риск по этой сделке')}
                        onClick={add}
                     >
                        {t('Добавить риск')}
                     </button>
                  )}
                  {link}
               </span>
            )
         }
         hint={t('{{count}} открытый', { count: risks.length })}
         title={title}
      >
         {risks.length ? (
            <RiskList
               risks={risks}
               onOpen={editable ? setOpen : undefined}
               onRemove={editable ? setRemoving : undefined}
            />
         ) : (
            <NoData>{t('Открытых рисков нет')}</NoData>
         )}
         <Modal
            open={open !== null}
            subtitle={deal.company}
            title={open?.title ? t('Риск') : t('Новый риск')}
            onClose={() => setOpen(null)}
         >
            {open && (
               <RiskForm
                  key={open.id}
                  deal={deal}
                  risk={open}
                  onClose={() => setOpen(null)}
               />
            )}
         </Modal>
         <ConfirmDialog
            open={removing !== null}
            subtitle={deal.company}
            title={t('Удалить риск «{{name}}»?', {
               name: removing?.title ?? '',
            })}
            onClose={() => setRemoving(null)}
            onConfirm={() => removing && deals.removeRisk(deal.id, removing.id)}
         >
            <p>
               {t('Риск уйдёт из карточки и из матрицы рисков меморандума.')}
            </p>
         </ConfirmDialog>
      </Card>
   );
};

interface RiskFormProps {
   deal: Deal;
   risk: Risk;
   onClose: () => void;
}

const RiskForm = ({ deal, risk, onClose }: RiskFormProps) => {
   const { t } = useTranslation('deals');
   const [draft, setDraft] = useState({
      level: risk.level,
      title: risk.title,
      note: risk.note,
      severity: risk.severity ? String(risk.severity) : '',
      measure: risk.measure ?? '',
      ownerId: risk.ownerId,
   });
   const [error, setError] = useState('');
   const saving = useAction((action: () => Promise<void>) => action());
   const set = (patch: Partial<typeof draft>) => {
      setDraft((prev) => ({ ...prev, ...patch }));
      setError('');
   };

   const run = async (action: () => Promise<void>) => {
      if (await saving.run(action)) onClose();
   };

   const submit = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const title = draft.title.trim();
      if (!title) {
         setError(t('Назовите риск'));
         return;
      }
      run(() =>
         deals.saveRisk(deal.id, {
            id: risk.id,
            // the memorandum's wording of the risk stays as it was
            ...(risk.short !== undefined && { short: risk.short }),
            level: draft.level,
            title,
            note: draft.note.trim(),
            ownerId: draft.ownerId,
            ...(draft.severity && { severity: Number(draft.severity) }),
            ...(draft.measure.trim() && { measure: draft.measure.trim() }),
         }),
      );
   };

   return (
      <form noValidate className={MODAL_FORM} onSubmit={submit}>
         <ModalBody>
            <div className='grid gap-4 sm:grid-cols-2'>
               <Field className='sm:col-span-2' error={error} label={t('Риск')}>
                  <input
                     data-autofocus
                     aria-invalid={!!error}
                     className='field-input'
                     maxLength={160}
                     value={draft.title}
                     onChange={(event) => set({ title: event.target.value })}
                  />
               </Field>
               <Field className='sm:col-span-2' label={t('Комментарий')}>
                  <textarea
                     className='field-input field-sizing-content min-h-16 resize-none'
                     maxLength={400}
                     value={draft.note}
                     onChange={(event) => set({ note: event.target.value })}
                  />
               </Field>
               <Field label={t('Уровень')}>
                  <select
                     className='field-input'
                     value={draft.level}
                     onChange={(event) =>
                        set({ level: event.target.value as Risk['level'] })
                     }
                  >
                     {(['high', 'medium'] as const).map((level) => (
                        <option key={level} value={level}>
                           {t(RISK_LEVEL_LABELS[level])}
                        </option>
                     ))}
                  </select>
               </Field>
               <Field label={t('Владелец')}>
                  <select
                     className='field-input'
                     value={draft.ownerId}
                     onChange={(event) => set({ ownerId: event.target.value })}
                  >
                     <option value=''>{t('не назначен')}</option>
                     {TEAM.map(({ id, name }) => (
                        <option key={id} value={id}>
                           {shortName(name)}
                        </option>
                     ))}
                  </select>
               </Field>
               <Field
                  hint={t('для матрицы рисков в меморандуме')}
                  label={t('Тяжесть')}
               >
                  <select
                     className='field-input'
                     value={draft.severity}
                     onChange={(event) => set({ severity: event.target.value })}
                  >
                     <option value=''>—</option>
                     {[1, 2, 3, 4, 5].map((value) => (
                        <option key={value} value={value}>
                           {t('{{value}} из 5', { value })}
                        </option>
                     ))}
                  </select>
               </Field>
               <Field label={t('Мера')}>
                  <input
                     className='field-input'
                     maxLength={200}
                     value={draft.measure}
                     onChange={(event) => set({ measure: event.target.value })}
                  />
               </Field>
            </div>
         </ModalBody>
         <ModalFooter>
            <Button
               hint={t('Закрыть окно, ничего не меняя')}
               variant='text'
               onClick={onClose}
            >
               {t('Отмена')}
            </Button>
            <Button
               hint={t('Сохранить риск')}
               loading={saving.pending}
               type='submit'
            >
               {t('Сохранить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

export default RisksCard;
