import SectionHeader from '@modules/Settings/pages/components/SectionHeader';
import {
   Button,
   ConfirmDialog,
   Loading,
   Notice,
   PageBody,
   PageHeader,
} from '@shared/components';
import { SITE_PATH } from '@shared/constants';
import { useCurrentUser, useTeamStatus } from '@shared/hooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useParams } from 'react-router';
import {
   DEFAULT_SITE_SECTION,
   isSiteSection,
   isSiteTable,
   sectionInfo,
   SITE_EDITORS,
   type SiteSection,
} from '../constants';
import { useSite } from '../hooks';
import site, { emptyTables, type SiteState } from '../services';
import Companies from './components/Companies';
import Contacts from './components/Contacts';
import Legal from './components/Legal';
import Media from './components/Media';
import News from './components/News';
import Partners from './components/Partners';
import SiteNav from './components/SiteNav';
import SiteTable from './components/SiteTable';
import Sources from './components/Sources';

const body = (section: SiteSection, data: SiteState) => {
   if (isSiteTable(section))
      return <SiteTable id={section} rows={data.tables[section]} />;
   switch (section) {
      case 'news':
         return <News news={data.news} />;
      case 'legal':
         return <Legal pages={data.legal} />;
      case 'sources':
         return <Sources sources={data.sources} />;
      case 'portfolio':
         return <Companies companies={data.companies} />;
      case 'contacts':
         return <Contacts key={data.contacts.id} contacts={data.contacts} />;
      case 'media':
         return <Media key={data.contacts.id} contacts={data.contacts} />;
      case 'partners':
         return <Partners requests={data.partners} />;
   }
};

/* «Сайт»: the public website's content, in plain forms, as Настройки is laid
   out. It lives in ucode, and what is saved is on the website at once. */
const SitePage = () => {
   const { t } = useTranslation('site');
   const { t: tLayout } = useTranslation('layout');
   const { section: param } = useParams();
   const user = useCurrentUser();
   const team = useTeamStatus();
   const data = useSite();
   const editor = SITE_EDITORS.includes(user.role);
   const [filling, setFilling] = useState(false);
   const empty = data ? emptyTables(data) : 0;

   if (!isSiteSection(param))
      return <Navigate replace to={`${SITE_PATH}/${DEFAULT_SITE_SECTION}`} />;
   const info = sectionInfo(param);
   const header = (
      <PageHeader
         bare
         section={
            <Link className='hover:text-ink' to={SITE_PATH}>
               {tLayout('Сайт')}
            </Link>
         }
         title={t(info.label)}
      />
   );

   if (!editor && team !== 'loading')
      return (
         <>
            {header}
            <PageBody className='pt-5'>
               <Notice>
                  {t('Менять сайт могут директор и его заместитель.')}
               </Notice>
            </PageBody>
         </>
      );
   return (
      <>
         {header}
         <div className='flex flex-1 flex-col gap-4 px-5 pt-5 lg:grid lg:h-[calc(100dvh-3.375rem)] lg:flex-none lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:gap-5 lg:overflow-hidden'>
            <SiteNav
               active={param}
               newPartners={
                  data?.partners.filter(({ status }) => status === 'new')
                     .length ?? 0
               }
            />
            <section key={param} className='flex min-w-0 flex-col lg:min-h-0'>
               {empty > 0 && (
                  <Notice className='mb-3' warning>
                     <span className='flex flex-wrap items-center justify-between gap-3'>
                        {t(
                           'Пустых таблиц: {{count}}. Заполните их тем, что уже есть на сайте.',
                           { count: empty },
                        )}
                        <Button
                           hint={t(
                              'Записать данные из кода сайта в пустые таблицы ucode',
                           )}
                           size='sm'
                           onClick={() => setFilling(true)}
                        >
                           {t('Заполнить данными сайта')}
                        </Button>
                     </span>
                  </Notice>
               )}
               <SectionHeader meta={t(info.meta)} title={t(info.label)} />
               <div className='pb-5 lg:-mr-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-5'>
                  {!data ? (
                     <Loading />
                  ) : data.stored ? (
                     body(param, data)
                  ) : (
                     <Notice warning>
                        {t(
                           'Таблицы сайта в ucode ещё не созданы (партии 19 и 20 в docs/ucode-migration.md). Пока их нет, менять здесь нечего.',
                        )}
                     </Notice>
                  )}
               </div>
            </section>
         </div>
         <ConfirmDialog
            confirmLabel={t('Заполнить')}
            error={t('Не удалось заполнить таблицы')}
            open={filling}
            success={t('Таблицы заполнены')}
            title={t('Заполнить пустые таблицы?')}
            onClose={() => setFilling(false)}
            onConfirm={() => site.fill()}
         >
            <p>
               {t(
                  'Данные из кода сайта запишутся только в пустые таблицы, заполненные не изменятся. Компании портфеля сразу появятся на сайте.',
               )}
            </p>
         </ConfirmDialog>
      </>
   );
};

export default SitePage;
