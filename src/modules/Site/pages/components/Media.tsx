import { Button, Card, Notice } from '@shared/components';
import type { SiteContacts } from '@shared/types/site.types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from '../../constants';
import { useSiteSave } from '../../hooks';
import site from '../../services';
import { FileField } from './parts';

// The site's logos and its two videos.
const Media = ({ contacts }: { contacts: SiteContacts }) => {
   const { t } = useTranslation('site');
   const [value, setValue] = useState(contacts);
   const changed = JSON.stringify(value) !== JSON.stringify(contacts);
   const saving = useSiteSave(() => site.saveContacts(value));
   const set = (key: keyof SiteContacts, address: string) =>
      setValue((known) => ({ ...known, [key]: address }));

   return (
      <div className='grid gap-4'>
         <div className='flex justify-end'>
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
         <Notice>
            {t(
               'Пока файл не загружен, на сайте стоит исходный логотип, а вместо видео заглушка. Загруженные файлы открыты всем, кто знает их адрес.',
            )}
         </Notice>
         <Card title={t('Логотипы')}>
            <div className='grid gap-4 px-4.5 py-3.5 md:grid-cols-2'>
               <FileField
                  hint={t('На белом фоне, в шапке сайта.')}
                  kind='image'
                  label={t('Логотип в шапке')}
                  maxBytes={MAX_IMAGE_BYTES}
                  value={value.logo}
                  onChange={(address) => set('logo', address)}
               />
               <FileField
                  dark
                  hint={t('На тёмном фоне, в подвале сайта.')}
                  kind='image'
                  label={t('Логотип в подвале')}
                  maxBytes={MAX_IMAGE_BYTES}
                  value={value.logoWhite}
                  onChange={(address) => set('logoWhite', address)}
               />
            </div>
         </Card>
         <Card title={t('Видео')}>
            <div className='grid gap-4 px-4.5 py-3.5 md:grid-cols-2'>
               <FileField
                  kind='video'
                  label={t('Видео на странице «Основателям»')}
                  maxBytes={MAX_VIDEO_BYTES}
                  value={value.foundersVideo}
                  onChange={(address) => set('foundersVideo', address)}
               />
               <FileField
                  kind='video'
                  label={t('Видео на странице «Инвесторам»')}
                  maxBytes={MAX_VIDEO_BYTES}
                  value={value.investorsVideo}
                  onChange={(address) => set('investorsVideo', address)}
               />
            </div>
         </Card>
      </div>
   );
};

export default Media;
