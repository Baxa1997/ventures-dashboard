import {
   BadgeSelect,
   Button,
   Card,
   ConfirmDialog,
   Field,
   FilterSelect,
   ItemActions,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
   NoData,
   Table,
   TD,
   TH,
} from '@shared/components';
import { TEAM } from '@shared/constants';
import { formatDate, personName } from '@shared/helpers';
import { useAction } from '@shared/hooks';
import {
   PARTNER_STATUSES,
   type PartnerRequest,
   type PartnerStatus,
} from '@shared/types/site.types';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PARTNER_STATUS_INFO } from '../../constants';
import site from '../../services';

const RequestDialog = ({
   request,
   onClose,
}: {
   request: PartnerRequest;
   onClose: () => void;
}) => {
   const { t } = useTranslation('site');
   const [ownerId, setOwnerId] = useState(request.ownerId);
   const [note, setNote] = useState(request.note);
   const saving = useAction(() =>
      site.savePartner(request.id, { ownerId, note }),
   );
   const submit = async (event: FormEvent) => {
      event.preventDefault();
      if (await saving.run()) onClose();
   };
   return (
      <form noValidate className={MODAL_FORM} onSubmit={submit}>
         <ModalBody>
            <div className='grid gap-4'>
               <dl className='text-meta grid gap-2 sm:grid-cols-2'>
                  {[
                     [t('Почта'), request.email],
                     [t('Телефон'), request.phone],
                     [t('Страна'), request.country],
                     [
                        t('Получена'),
                        request.submittedAt
                           ? formatDate(request.submittedAt.slice(0, 10))
                           : '',
                     ],
                  ].map(([label, value]) => (
                     <div key={label}>
                        <dt className='text-ink-soft text-xs'>{label}</dt>
                        <dd>{value || '—'}</dd>
                     </div>
                  ))}
               </dl>
               <div>
                  <div className='text-ink-soft mb-1 text-xs'>
                     {t('Обращение')}
                  </div>
                  <p className='text-meta whitespace-pre-wrap'>
                     {request.request || '—'}
                  </p>
               </div>
               <Field label={t('Кто отвечает')}>
                  <select
                     className='field-input'
                     value={ownerId}
                     onChange={(event) => setOwnerId(event.target.value)}
                  >
                     <option value=''>{t('Никто')}</option>
                     {TEAM.map(({ id, name }) => (
                        <option key={id} value={id}>
                           {name}
                        </option>
                     ))}
                  </select>
               </Field>
               <Field label={t('Заметка для фонда')}>
                  <textarea
                     className='field-input'
                     rows={3}
                     value={note}
                     onChange={(event) => setNote(event.target.value)}
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
               hint={t(
                  'Сохранить ответственного и заметку: на сайте их не видно',
               )}
               loading={saving.pending}
               type='submit'
            >
               {t('Сохранить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

// What came through the website's form «Стать партнёром».
const Partners = ({ requests }: { requests: PartnerRequest[] }) => {
   const { t } = useTranslation('site');
   const [status, setStatus] = useState<PartnerStatus | ''>('');
   const [open, setOpen] = useState<PartnerRequest | null>(null);
   const [removing, setRemoving] = useState<PartnerRequest | null>(null);
   const changing = useAction(
      (id: string, next: PartnerStatus) =>
         site.savePartner(id, { status: next }),
      { success: t('Статус заявки изменён') },
   );
   const shown = requests.filter((item) => !status || item.status === status);
   const options = PARTNER_STATUSES.map((value) => ({
      value,
      label: t(PARTNER_STATUS_INFO[value].label),
      tone: PARTNER_STATUS_INFO[value].tone,
   }));

   return (
      <div className='grid gap-4'>
         <div>
            <FilterSelect
               label={t('Статус')}
               options={[
                  { value: '' as const, label: t('Все') },
                  ...options.map(({ value, label }) => ({ value, label })),
               ]}
               value={status}
               onChange={setStatus}
            />
         </div>
         <Card>
            {shown.length ? (
               <Table
                  head={
                     <>
                        <th className={TH}>{t('От кого')}</th>
                        <th className={TH}>{t('Обращение')}</th>
                        <th className={TH}>{t('Получена')}</th>
                        <th className={TH}>{t('Кто отвечает')}</th>
                        <th className={TH}>{t('Статус')}</th>
                        <th className={TH} />
                     </>
                  }
               >
                  {shown.map((item) => (
                     <tr key={item.id}>
                        <td className={TD}>
                           <button
                              type='button'
                              className='text-left font-semibold'
                              data-hint={t('Открыть заявку')}
                              onClick={() => setOpen(item)}
                           >
                              {item.name}
                           </button>
                           <div className='text-ink-faint text-xs'>
                              {[item.email, item.phone]
                                 .filter(Boolean)
                                 .join(' · ')}
                           </div>
                        </td>
                        <td className={TD}>
                           <div className='text-ink-soft line-clamp-2 max-w-[44ch] text-xs'>
                              {item.request}
                           </div>
                        </td>
                        <td className={`${TD} whitespace-nowrap`}>
                           {item.submittedAt &&
                              formatDate(item.submittedAt.slice(0, 10))}
                        </td>
                        <td className={`${TD} whitespace-nowrap`}>
                           {item.ownerId ? personName(item.ownerId) : '—'}
                        </td>
                        <td className={TD}>
                           <BadgeSelect
                              label={t('Статус заявки')}
                              options={options}
                              value={item.status}
                              onChange={(next) =>
                                 void changing.run(item.id, next)
                              }
                           />
                        </td>
                        <td className={TD}>
                           <ItemActions
                              icons
                              name={item.name}
                              onDelete={() => setRemoving(item)}
                              onEdit={() => setOpen(item)}
                           />
                        </td>
                     </tr>
                  ))}
               </Table>
            ) : (
               <NoData>{t('Заявок партнёров пока нет')}</NoData>
            )}
         </Card>
         <Modal
            open={open !== null}
            subtitle={open?.name}
            title={t('Заявка партнёра')}
            onClose={() => setOpen(null)}
         >
            {open && (
               <RequestDialog request={open} onClose={() => setOpen(null)} />
            )}
         </Modal>
         <ConfirmDialog
            open={removing !== null}
            subtitle={removing?.name}
            success={t('Заявка удалена')}
            title={t('Удалить заявку партнёра?')}
            onClose={() => setRemoving(null)}
            onConfirm={() => removing && site.removePartner(removing.id)}
         >
            <p>{t('Вернуть её будет нельзя.')}</p>
         </ConfirmDialog>
      </div>
   );
};

export default Partners;
