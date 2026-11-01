import portfolio from '@modules/Portfolio/services';
import { listOf, nameOf } from '@modules/Settings/services';
import {
   Badge,
   Button,
   Card,
   ConfirmDialog,
   Field,
   ItemActions,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
   NoData,
   Switch,
   Table,
   TD,
   TH,
} from '@shared/components';
import { useServiceData } from '@shared/hooks';
import type { SiteCompany } from '@shared/types/site.types';
import { Plus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { emptyLocalized, firstOf, moved } from '../../helpers';
import { useSiteSave } from '../../hooks';
import site from '../../services';
import { LocalizedRow, OnSite, OrderButtons } from './parts';

const loadFund = () => portfolio.getState();
const subscribeFund = (listener: () => void) => portfolio.subscribe(listener);

const blank = (order: number): SiteCompany => ({
   id: '',
   name: '',
   industry: '',
   stage: '',
   status: 'active',
   city: '',
   country: '',
   invested: 0,
   year: '',
   website: '',
   founder: '',
   founderRole: '',
   founderLinkedin: '',
   order,
   visible: true,
   tagline: emptyLocalized(),
   quote: emptyLocalized(),
});

const CompanyDialog = ({
   company,
   onClose,
}: {
   company: SiteCompany;
   onClose: () => void;
}) => {
   const { t } = useTranslation('site');
   const fund = useServiceData(loadFund, subscribeFund);
   const [value, setValue] = useState(company);
   const ready = Boolean(value.name.trim());
   const saving = useSiteSave(() => site.save('companies', value));
   const set = <K extends keyof SiteCompany>(key: K, next: SiteCompany[K]) =>
      setValue((known) => ({ ...known, [key]: next }));
   const text = (key: keyof SiteCompany, label: string, url = false) => (
      <Field label={label}>
         <input
            className='field-input'
            inputMode={url ? 'url' : undefined}
            placeholder={url ? 'https://' : undefined}
            value={String(value[key])}
            onChange={(event) =>
               setValue((known) => ({ ...known, [key]: event.target.value }))
            }
         />
      </Field>
   );

   // takes what the fund's own card already knows
   const fill = (id: string) => {
      const from = fund?.companies.find((item) => item.id === id);
      if (!from) return;
      setValue((known) => ({
         ...known,
         name: from.name,
         industry: from.industryKey || known.industry,
         country: from.countries || known.country,
         invested: from.invested,
         year: from.since ? String(from.since) : known.year,
         status: from.status === 'active' ? 'active' : 'exit',
         tagline: {
            ...known.tagline,
            ru: from.tagline || from.about || known.tagline.ru,
         },
      }));
   };

   const submit = async (event: FormEvent) => {
      event.preventDefault();
      if (ready && (await saving.run())) onClose();
   };

   return (
      <form noValidate className={MODAL_FORM} onSubmit={submit}>
         <ModalBody>
            <div className='grid gap-4'>
               {!value.id && (fund?.companies.length ?? 0) > 0 && (
                  <Field
                     hint={t(
                        'Подставит название, отрасль, страну, сумму и описание. Проверьте их перед сохранением.',
                     )}
                     label={t('Заполнить из портфеля фонда')}
                  >
                     <select
                        className='field-input'
                        defaultValue=''
                        onChange={(event) => fill(event.target.value)}
                     >
                        <option value=''>{t('Выберите компанию')}</option>
                        {fund?.companies.map(({ id, name }) => (
                           <option key={id} value={id}>
                              {name}
                           </option>
                        ))}
                     </select>
                  </Field>
               )}
               <div className='grid gap-3 md:grid-cols-3'>
                  {text('name', t('Название'))}
                  <Field label={t('Отрасль')}>
                     <select
                        className='field-input'
                        value={value.industry}
                        onChange={(event) =>
                           set('industry', event.target.value)
                        }
                     >
                        <option value=''>{t('Не указана')}</option>
                        {listOf('industries').map((item) => (
                           <option key={item.key} value={item.key}>
                              {nameOf(item)}
                           </option>
                        ))}
                     </select>
                  </Field>
                  <Field label={t('Стадия')}>
                     <select
                        className='field-input'
                        value={value.stage}
                        onChange={(event) => set('stage', event.target.value)}
                     >
                        <option value=''>{t('Не указана')}</option>
                        {listOf('rounds').map((item) => (
                           <option
                              key={item.key}
                              value={item.names.en || item.key}
                           >
                              {nameOf(item)}
                           </option>
                        ))}
                     </select>
                  </Field>
                  <Field label={t('Статус')}>
                     <select
                        className='field-input'
                        value={value.status}
                        onChange={(event) =>
                           set(
                              'status',
                              event.target.value as SiteCompany['status'],
                           )
                        }
                     >
                        <option value='active'>{t('В портфеле')}</option>
                        <option value='exit'>{t('Выход')}</option>
                     </select>
                  </Field>
                  {text('city', t('Город'))}
                  {text('country', t('Страна'))}
                  <Field label={t('Инвестировано, $')}>
                     <input
                        className='field-input'
                        inputMode='numeric'
                        value={value.invested || ''}
                        onChange={(event) =>
                           set(
                              'invested',
                              Number(event.target.value.replace(/\D/g, '')) ||
                                 0,
                           )
                        }
                     />
                  </Field>
                  {text('year', t('Год инвестиции'))}
                  {text('website', t('Сайт компании'), true)}
                  {text('founder', t('Основатель'))}
                  {text('founderRole', t('Должность основателя'))}
                  {text('founderLinkedin', t('LinkedIn основателя'), true)}
               </div>
               <LocalizedRow
                  label={t('Чем занимается')}
                  rows={4}
                  value={value.tagline}
                  onChange={(tagline) => set('tagline', tagline)}
               />
               <LocalizedRow
                  label={t('Цитата основателя')}
                  rows={3}
                  value={value.quote}
                  onChange={(quote) => set('quote', quote)}
               />
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
               disabled={!ready}
               hint={
                  ready
                     ? t('Сохранить и сразу показать на сайте')
                     : t('Напишите название компании')
               }
               loading={saving.pending}
               type='submit'
            >
               {t('Сохранить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

const Companies = ({ companies }: { companies: SiteCompany[] }) => {
   const { t } = useTranslation('site');
   const [editing, setEditing] = useState<SiteCompany | null>(null);
   const [removing, setRemoving] = useState<SiteCompany | null>(null);
   const moving = useSiteSave((list: SiteCompany[]) =>
      site.reorder('companies', list),
   );
   const showing = useSiteSave((id: string, shown: boolean) =>
      site.setShown('companies', id, shown),
   );

   return (
      <div className='grid gap-4'>
         <div className='flex items-center justify-end gap-3'>
            <OnSite path='/portfolio' />
            <Button
               hint={t(
                  'Добавить компанию на сайт, вручную или из портфеля фонда',
               )}
               onClick={() => setEditing(blank(companies.length + 1))}
            >
               <Plus aria-hidden />
               {t('Добавить компанию')}
            </Button>
         </div>
         <Card>
            {companies.length ? (
               <Table
                  head={
                     <>
                        <th className={TH} />
                        <th className={TH}>{t('Компания')}</th>
                        <th className={TH}>{t('Статус')}</th>
                        <th className={TH}>{t('Год')}</th>
                        <th className={TH}>{t('На сайте')}</th>
                        <th className={TH} />
                     </>
                  }
               >
                  {companies.map((company, index) => (
                     <tr key={company.id}>
                        <td className={TD}>
                           <OrderButtons
                              busy={moving.pending}
                              first={index === 0}
                              last={index === companies.length - 1}
                              name={company.name}
                              onMove={(step) => {
                                 const next = moved(
                                    companies,
                                    company.id,
                                    step,
                                 );
                                 if (next) void moving.run(next);
                              }}
                           />
                        </td>
                        <td className={TD}>
                           <button
                              type='button'
                              className='text-left font-semibold'
                              data-hint={t('Открыть компанию')}
                              onClick={() => setEditing(company)}
                           >
                              {company.name}
                           </button>
                           <div className='text-ink-faint mt-0.5 max-w-[56ch] truncate text-xs'>
                              {firstOf(company.tagline)}
                           </div>
                        </td>
                        <td className={TD}>
                           <Badge
                              tone={
                                 company.status === 'exit'
                                    ? 'neutral'
                                    : 'success'
                              }
                           >
                              {company.status === 'exit'
                                 ? t('Выход')
                                 : t('В портфеле')}
                           </Badge>
                        </td>
                        <td className={`${TD} tabular-nums`}>{company.year}</td>
                        <td className={TD}>
                           <Switch
                              small
                              checked={company.visible}
                              disabled={showing.pending}
                              hint={
                                 company.visible
                                    ? t('Скрыть компанию с сайта')
                                    : t('Показать компанию на сайте')
                              }
                              label={company.name}
                              onChange={(next) =>
                                 void showing.run(company.id, next)
                              }
                           />
                        </td>
                        <td className={TD}>
                           <ItemActions
                              icons
                              name={company.name}
                              onDelete={() => setRemoving(company)}
                              onEdit={() => setEditing(company)}
                           />
                        </td>
                     </tr>
                  ))}
               </Table>
            ) : (
               <NoData />
            )}
         </Card>
         <Modal
            open={editing !== null}
            size='wide'
            title={editing?.id ? editing.name : t('Новая компания на сайте')}
            onClose={() => setEditing(null)}
         >
            {editing && (
               <CompanyDialog
                  company={editing}
                  onClose={() => setEditing(null)}
               />
            )}
         </Modal>
         <ConfirmDialog
            open={removing !== null}
            subtitle={removing?.name}
            success={t('Компания убрана с сайта')}
            title={t('Убрать компанию с сайта?')}
            onClose={() => setRemoving(null)}
            onConfirm={() => removing && site.remove('companies', removing.id)}
         >
            <p>{t('Внутренний портфель фонда это не затронет.')}</p>
         </ConfirmDialog>
      </div>
   );
};

export default Companies;
