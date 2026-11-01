import { Button, Card, Field } from '@shared/components';
import type { SiteContacts } from '@shared/types/site.types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSiteSave } from '../../hooks';
import site from '../../services';
import { LocalizedRow, OnSite } from './parts';

// The fund's contacts: what the Contacts page and the footer show.
const Contacts = ({ contacts }: { contacts: SiteContacts }) => {
   const { t } = useTranslation('site');
   const [value, setValue] = useState(contacts);
   const changed = JSON.stringify(value) !== JSON.stringify(contacts);

   const saving = useSiteSave(() => site.saveContacts(value));
   const text = (
      key: 'email' | 'phone' | 'mapUrl' | 'telegram' | 'linkedin' | 'instagram',
      label: string,
      url = false,
   ) => (
      <Field label={label}>
         <input
            className='field-input'
            inputMode={url ? 'url' : undefined}
            placeholder={url ? 'https://' : undefined}
            value={value[key]}
            onChange={(event) =>
               setValue({ ...value, [key]: event.target.value })
            }
         />
      </Field>
   );

   return (
      <div className='grid gap-4'>
         <div className='flex items-center justify-end gap-3'>
            <OnSite path='/contacts' />
            <Button
               disabled={!changed}
               hint={
                  changed
                     ? t('Сохранить и сразу показать на сайте')
                     : t('Изменений пока нет')
               }
               loading={saving.pending}
               onClick={() => void saving.run()}
            >
               {t('Сохранить')}
            </Button>
         </div>
         <Card title={t('Адрес и часы работы')}>
            <div className='grid gap-4 px-4.5 py-3.5'>
               <LocalizedRow
                  label={t('Адрес')}
                  rows={2}
                  value={value.address}
                  onChange={(address) => setValue({ ...value, address })}
               />
               <LocalizedRow
                  label={t('Часы работы')}
                  rows={1}
                  value={value.hours}
                  onChange={(hours) => setValue({ ...value, hours })}
               />
               {text('mapUrl', t('Ссылка на карту'), true)}
            </div>
         </Card>
         <Card title={t('Связь')}>
            <div className='grid gap-3 px-4.5 py-3.5 md:grid-cols-2'>
               {text('email', t('Почта'))}
               {text('phone', t('Телефон'))}
            </div>
         </Card>
         <Card title={t('Соцсети')}>
            <div className='grid gap-3 px-4.5 py-3.5 md:grid-cols-3'>
               {text('telegram', 'Telegram', true)}
               {text('linkedin', 'LinkedIn', true)}
               {text('instagram', 'Instagram', true)}
            </div>
         </Card>
      </div>
   );
};

export default Contacts;
