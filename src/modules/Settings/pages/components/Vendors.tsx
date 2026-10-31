import settings, { listName, listOf } from '@modules/Settings/services';
import { ConfirmDialog, Notice, Switch } from '@shared/components';
import { useCurrentUser } from '@shared/hooks';
import type { Vendor, VendorInput } from '@shared/types/procurement.types';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
   ACTION_COLUMN,
   CELL,
   DictCard,
   HEAD,
   ROW_SELECT,
   RowDelete,
   RowInput,
   STICKY_END,
   useRowDraft,
} from './Dict';

const inputOf = ({ id: _id, sortOrder: _sortOrder, ...input }: Vendor) => input;

// How the journal shows a vendor.
const describe = (
   t: ReturnType<typeof useTranslation<'settings'>>['t'],
   vendor: VendorInput | null,
) =>
   vendor
      ? [
           vendor.name,
           vendor.tin,
           listName('procCategories', vendor.category),
           vendor.contact,
           vendor.phone,
           vendor.active ? t('используется') : t('отключён'),
        ]
           .filter(Boolean)
           .join(' · ')
      : '';

interface VendorRowProps {
   vendor: Vendor;
   editable: boolean;
   onDelete: () => void;
}

// One vendor, every field of it changed where it stands.
const VendorRow = ({ vendor, editable, onDelete }: VendorRowProps) => {
   const { t } = useTranslation('settings');
   const user = useCurrentUser();
   const row = useRowDraft<VendorInput>(async (draft) => {
      const current = (await settings.getSettings()).vendors.find(
         ({ id }) => id === vendor.id,
      );
      if (!current) return;
      const before = inputOf(current);
      const next = { ...before, ...draft };
      if (JSON.stringify(next) === JSON.stringify(before)) return;
      await settings.saveVendor(
         vendor.id,
         next,
         user.id,
         t('Поставщик · {{name}}', { name: next.name }),
         (value) => describe(t, value),
      );
   });
   const shown = { ...vendor, ...row.draft };
   const saved = t('Сохранено');
   const categories = listOf('procCategories', true);

   return (
      <tr>
         <td className={CELL}>
            <Switch
               small
               checked={shown.active}
               disabled={!editable}
               label={t('Используется: {{name}}', { name: shown.name })}
               onChange={(active) => row.change({ active }, saved)}
            />
         </td>
         <td className={CELL}>
            <RowInput
               disabled={!editable}
               label={t('Компания')}
               maxLength={120}
               value={shown.name}
               onSave={(name) => name && row.change({ name }, saved)}
            />
         </td>
         <td className={CELL}>
            <RowInput
               disabled={!editable}
               inputMode='numeric'
               label={t('ИНН')}
               maxLength={9}
               placeholder={t('9 цифр')}
               value={shown.tin}
               onSave={(tin) => row.change({ tin }, saved)}
            />
         </td>
         <td className={CELL}>
            <select
               aria-label={t('Категория')}
               className={ROW_SELECT}
               disabled={!editable}
               value={shown.category}
               onChange={(event) =>
                  row.change({ category: event.target.value }, saved)
               }
            >
               {categories.map(({ key }) => (
                  <option key={key} value={key}>
                     {listName('procCategories', key)}
                  </option>
               ))}
            </select>
         </td>
         <td className={CELL}>
            <RowInput
               disabled={!editable}
               label={t('Контакт')}
               maxLength={120}
               value={shown.contact}
               onSave={(contact) => row.change({ contact }, saved)}
            />
         </td>
         <td className={CELL}>
            <RowInput
               disabled={!editable}
               label={t('Телефон')}
               maxLength={40}
               value={shown.phone}
               onSave={(phone) => row.change({ phone }, saved)}
            />
         </td>
         <td className={clsx(CELL, STICKY_END)}>
            {editable && <RowDelete name={shown.name} onDelete={onDelete} />}
         </td>
      </tr>
   );
};

interface VendorsProps {
   vendors: Vendor[];
   editable: boolean;
   stored: boolean; // ucode has the table to keep them in
}

/* The vendors requests are made to and contracts with, edited where they
   stand. A new one starts as a row to fill in. One a request names is turned
   off rather than deleted: new requests stop offering it, the old keep it. */
const Vendors = ({ vendors, editable, stored }: VendorsProps) => {
   const { t } = useTranslation('settings');
   const user = useCurrentUser();
   const [removing, setRemoving] = useState<Vendor | null>(null);
   const [used, setUsed] = useState<number | null>(null);

   useEffect(() => {
      setUsed(null);
      if (removing)
         settings.vendorUsage(removing.id).then(setUsed, () => setUsed(-1));
   }, [removing]);

   const add = () =>
      settings.saveVendor(
         null,
         {
            name: t('Новый поставщик'),
            tin: '',
            category: listOf('procCategories')[0]?.key ?? '',
            contact: '',
            phone: '',
            active: true,
         },
         user.id,
         t('Поставщик · {{name}}', { name: t('Новый поставщик') }),
         (value) => describe(t, value),
      );

   return (
      <>
         {!stored && (
            <Notice warning>
               {t(
                  'Поставщиков можно будет вести здесь, когда в ucode появится их таблица.',
               )}
            </Notice>
         )}
         <DictCard
            addLabel={t('Добавить')}
            className='min-w-[56rem]'
            editable={editable}
            head={
               <>
                  <th className={clsx(HEAD, 'w-14')}>{t('Вкл.')}</th>
                  <th className={HEAD}>{t('Компания')}</th>
                  <th className={clsx(HEAD, 'w-28')}>{t('ИНН')}</th>
                  <th className={clsx(HEAD, 'w-48')}>{t('Категория')}</th>
                  <th className={HEAD}>{t('Контакт')}</th>
                  <th className={clsx(HEAD, 'w-36')}>{t('Телефон')}</th>
                  <th className={clsx(HEAD, ACTION_COLUMN, STICKY_END)}>
                     <span className='sr-only'>{t('Действия')}</span>
                  </th>
               </>
            }
            note={
               editable
                  ? t(
                       'Изменения сохраняются сразу и попадают в журнал. Выключенного поставщика новые заявки не предлагают.',
                    )
                  : t('Менять справочники может только директор.')
            }
            onAdd={add}
         >
            {vendors.length ? (
               vendors.map((vendor) => (
                  <VendorRow
                     key={vendor.id}
                     editable={editable}
                     vendor={vendor}
                     onDelete={() => setRemoving(vendor)}
                  />
               ))
            ) : (
               <tr>
                  <td
                     className='text-ink-soft px-4.5 py-8 text-center'
                     colSpan={7}
                  >
                     {t('Список пуст')}
                  </td>
               </tr>
            )}
         </DictCard>
         <ConfirmDialog
            disabled={used !== 0}
            open={removing !== null}
            subtitle={removing?.name}
            title={t('Удалить поставщика?')}
            onClose={() => setRemoving(null)}
            onConfirm={async () => {
               if (!removing) return;
               await settings.deleteVendor(
                  removing.id,
                  user.id,
                  t('Поставщик · {{name}}', { name: removing.name }),
                  describe(t, inputOf(removing)),
               );
               setRemoving(null);
            }}
         >
            {used === null ? (
               <p>{t('Проверяем, где используется…')}</p>
            ) : used < 0 ? (
               <p className='text-danger'>
                  {t('Не удалось проверить, где используется строка.')}
               </p>
            ) : used > 0 ? (
               <p>
                  {t(
                     'Поставщик указан в заявках на закупку ({{count}}): отключите его, и новые заявки перестанут его предлагать.',
                     { count: used },
                  )}
               </p>
            ) : (
               <p>{t('Поставщик исчезнет из справочника.')}</p>
            )}
         </ConfirmDialog>
      </>
   );
};

export default Vendors;
