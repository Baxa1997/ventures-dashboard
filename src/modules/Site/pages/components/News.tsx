import {
   Badge,
   Button,
   Card,
   ConfirmDialog,
   FilterSelect,
   ItemActions,
   NoData,
   Notice,
   SearchField,
   Segmented,
   Switch,
   Table,
   TD,
   TH,
} from '@shared/components';
import { SITE_PATH } from '@shared/constants';
import { formatDate } from '@shared/helpers';
import { useAction, useRefreshOnReturn } from '@shared/hooks';
import { readPref, writePref } from '@shared/services/prefs';
import {
   SITE_CATEGORIES,
   type SiteCategory,
   type SiteNews,
} from '@shared/types/site.types';
import { ArrowUpRight, LayoutGrid, Plus, Rows3 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';
import { CATEGORY_LABELS } from '../../constants';
import { filledIn, firstOf } from '../../helpers';
import { useSiteSave } from '../../hooks';
import site from '../../services';
import { isFound, NewsCard, RejectButton } from './NewsCard';
import { LangMarks, OnSite } from './parts';

/* The list's filter by state. «Найдено» is what the news collector brought
   and nobody has published or rejected yet (Настройки → Сбор новостей); a
   rejected one shows only under «Отклонённые». */
type Status = '' | 'published' | 'draft' | 'found' | 'rejected';
const STATUS_TEST: Record<Status, (item: SiteNews) => boolean> = {
   '': (item) => !item.rejected,
   published: (item) => item.published,
   draft: (item) => !item.published && !item.rejected,
   found: isFound,
   rejected: (item) => item.rejected,
};

// The list as a table or as cards, as the person last chose (prefs).
type View = 'cards' | 'table';
const VIEW_PREF = 'site.news.view';

const News = ({ news }: { news: SiteNews[] }) => {
   const { t } = useTranslation('site');
   const navigate = useNavigate();
   const [removing, setRemoving] = useState<SiteNews | null>(null);
   // the collector adds news on the server: read them on opening and on return
   useEffect(() => {
      void site.refreshNews().catch((error: unknown) => console.error(error));
   }, []);
   useRefreshOnReturn(() => site.refreshNews());
   const [params] = useSearchParams();
   const [category, setCategory] = useState<SiteCategory | ''>('');
   const [status, setStatus] = useState<Status>(
      params.get('status') === 'found' ? 'found' : '',
   );
   const [query, setQuery] = useState('');
   const [view, setView] = useState<View>(() =>
      readPref<View>(VIEW_PREF, 'cards') === 'table' ? 'table' : 'cards',
   );
   const changeView = (next: View) => {
      setView(next);
      writePref(VIEW_PREF, next);
   };
   const open = (item: SiteNews) => navigate(`${SITE_PATH}/news/${item.id}`);
   const showing = useSiteSave((id: string, shown: boolean) =>
      site.setShown('news', id, shown),
   );
   const rejecting = useAction(
      (item: SiteNews, rejected: boolean) => site.reject(item.id, rejected),
      {
         success: (_item, rejected) =>
            rejected
               ? t('Новость отклонена: сборщик её больше не принесёт')
               : t('Новость возвращена в найденные'),
      },
   );
   const needle = query.trim().toLowerCase();
   const shown = news.filter(
      (item) =>
         (!category || item.category === category) &&
         STATUS_TEST[status](item) &&
         (!needle ||
            Object.values(item.title).some((title) =>
               title.toLowerCase().includes(needle),
            )),
   );
   const found = news.filter(STATUS_TEST.found).length;

   return (
      <div className='grid gap-4'>
         <div className='flex flex-wrap items-center gap-2'>
            <SearchField
               label={t('Найти новость')}
               value={query}
               onChange={setQuery}
            />
            <FilterSelect
               label={t('Рубрика')}
               options={[
                  { value: '' as const, label: t('Все') },
                  ...SITE_CATEGORIES.map((value) => ({
                     value,
                     label: t(CATEGORY_LABELS[value]),
                  })),
               ]}
               value={category}
               onChange={setCategory}
            />
            <FilterSelect
               label={t('Статус')}
               options={[
                  { value: '' as const, label: t('Все') },
                  { value: 'published' as const, label: t('Опубликованы') },
                  { value: 'draft' as const, label: t('Черновики') },
                  { value: 'found' as const, label: t('Найдено сборщиком') },
                  { value: 'rejected' as const, label: t('Отклонённые') },
               ]}
               value={status}
               onChange={setStatus}
            />
            <span className='ml-auto flex items-center gap-3'>
               <Segmented
                  items={[
                     {
                        id: 'cards',
                        label: t('Карточки'),
                        icon: LayoutGrid,
                        iconOnly: true,
                     },
                     {
                        id: 'table',
                        label: t('Таблица'),
                        icon: Rows3,
                        iconOnly: true,
                     },
                  ]}
                  label={t('Вид списка новостей')}
                  value={view}
                  onChange={changeView}
               />
               <OnSite path='/news' />
               <Button
                  hint={t('Написать новую новость')}
                  onClick={() => navigate(`${SITE_PATH}/news/new`)}
               >
                  <Plus aria-hidden />
                  {t('Новая новость')}
               </Button>
            </span>
         </div>
         {found > 0 && status !== 'found' && (
            <Notice>
               <span className='flex flex-wrap items-center justify-between gap-3'>
                  {t(
                     'Сборщик нашёл новости: {{count}}. Они ждут проверки — опубликуйте подходящие или отклоните.',
                     { count: found },
                  )}
                  <Button
                     hint={t('Показать только найденные сборщиком новости')}
                     size='sm'
                     variant='ghost'
                     onClick={() => setStatus('found')}
                  >
                     {t('Показать найденные')}
                  </Button>
               </span>
            </Notice>
         )}
         {view === 'cards' && shown.length > 0 ? (
            <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
               {shown.map((item) => (
                  <NewsCard
                     key={item.id}
                     item={item}
                     publishing={showing.pending}
                     rejecting={rejecting.pending}
                     onDelete={() => setRemoving(item)}
                     onOpen={() => open(item)}
                     onPublish={(next) => void showing.run(item.id, next)}
                     onReject={(one, rejected) =>
                        void rejecting.run(one, rejected)
                     }
                  />
               ))}
            </div>
         ) : (
            <Card>
               {shown.length ? (
                  <Table
                     head={
                        <>
                           <th className={TH}>{t('Заголовок')}</th>
                           <th className={TH}>{t('Рубрика')}</th>
                           <th className={TH}>{t('Дата')}</th>
                           <th className={TH}>{t('Языки')}</th>
                           <th className={TH}>{t('На сайте')}</th>
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
                                 data-hint={t('Открыть новость')}
                                 onClick={() => open(item)}
                              >
                                 {firstOf(item.title)}
                              </button>
                              {STATUS_TEST.found(item) && (
                                 <span className='ml-2 inline-block align-middle'>
                                    <Badge tone='accent'>{t('Найдено')}</Badge>
                                 </span>
                              )}
                              <div className='text-ink-faint mt-0.5 max-w-[56ch] truncate text-xs'>
                                 {firstOf(item.excerpt)}
                              </div>
                              {item.collected && (
                                 <div className='text-ink-faint mt-0.5 flex max-w-[56ch] items-center gap-1.5 text-xs'>
                                    {item.url && (
                                       <a
                                          className='text-accent inline-flex shrink-0 items-center gap-0.5 font-semibold hover:underline'
                                          data-hint={t(
                                             'Открыть статью в издании',
                                          )}
                                          href={item.url}
                                          rel='noreferrer'
                                          target='_blank'
                                       >
                                          {item.outlet || t('Оригинал')}
                                          <ArrowUpRight
                                             aria-hidden
                                             className='size-3'
                                          />
                                       </a>
                                    )}
                                    {item.note && (
                                       <span
                                          className='truncate'
                                          title={item.note}
                                       >
                                          · {item.note}
                                       </span>
                                    )}
                                 </div>
                              )}
                           </td>
                           <td className={`${TD} whitespace-nowrap`}>
                              {t(CATEGORY_LABELS[item.category])}
                           </td>
                           <td className={`${TD} whitespace-nowrap`}>
                              {item.date && formatDate(item.date)}
                           </td>
                           <td className={TD}>
                              <LangMarks filled={filledIn(item.title)} />
                           </td>
                           <td className={TD}>
                              <Switch
                                 small
                                 checked={item.published}
                                 disabled={showing.pending}
                                 hint={
                                    item.published
                                       ? t('Снять новость с сайта')
                                       : t('Опубликовать новость на сайте')
                                 }
                                 label={firstOf(item.title)}
                                 onChange={(next) =>
                                    void showing.run(item.id, next)
                                 }
                              />
                           </td>
                           <td className={TD}>
                              <span className='flex items-center justify-end gap-1'>
                                 <RejectButton
                                    item={item}
                                    pending={rejecting.pending}
                                    onReject={(one, rejected) =>
                                       void rejecting.run(one, rejected)
                                    }
                                 />
                                 <ItemActions
                                    icons
                                    name={firstOf(item.title)}
                                    onDelete={() => setRemoving(item)}
                                    onEdit={() => open(item)}
                                 />
                              </span>
                           </td>
                        </tr>
                     ))}
                  </Table>
               ) : (
                  <NoData>
                     {news.length
                        ? t('Таких новостей нет')
                        : t(
                             'Новостей пока нет: на сайте написано «Пока ничего не опубликовано».',
                          )}
                  </NoData>
               )}
            </Card>
         )}
         <ConfirmDialog
            open={removing !== null}
            subtitle={removing ? firstOf(removing.title) : undefined}
            success={t('Новость удалена')}
            title={t('Удалить новость?')}
            onClose={() => setRemoving(null)}
            onConfirm={() => removing && site.remove('news', removing.id)}
         >
            <p>{t('Она пропадёт с сайта, вернуть её будет нельзя.')}</p>
         </ConfirmDialog>
      </div>
   );
};

export default News;
