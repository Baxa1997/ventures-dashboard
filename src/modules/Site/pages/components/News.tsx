import {
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
   RichTextEditor,
   SearchField,
   Switch,
   Table,
   TD,
   TH,
} from '@shared/components';
import { formatDate } from '@shared/helpers';
import {
   SITE_CATEGORIES,
   type SiteCategory,
   type SiteLanguage,
   type SiteNews,
} from '@shared/types/site.types';
import { Plus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CATEGORY_LABELS, MAX_IMAGE_BYTES } from '../../constants';
import { filledIn, firstOf, slugOf } from '../../helpers';
import { useSiteSave } from '../../hooks';
import site from '../../services';
import { FileField, LangMarks, LangTabs, OnSite } from './parts';

const NewsDialog = ({
   news,
   slugs,
   onClose,
}: {
   news: SiteNews;
   slugs: string[];
   onClose: () => void;
}) => {
   const { t } = useTranslation('site');
   const [value, setValue] = useState(news);
   const [language, setLanguage] = useState<SiteLanguage>('ru');
   const [tried, setTried] = useState(false);
   const titled = Boolean(firstOf(value.title).trim());
   const press = value.category === 'Press';
   const saving = useSiteSave(() =>
      site.save('news', {
         ...value,
         slug:
            value.slug ||
            slugOf(value.title.en || value.title.ru || value.title.uz, slugs),
      }),
   );

   const submit = async (event: FormEvent) => {
      event.preventDefault();
      setTried(true);
      if (titled && (await saving.run())) onClose();
   };
   const set = <K extends keyof SiteNews>(key: K, next: SiteNews[K]) =>
      setValue((known) => ({ ...known, [key]: next }));

   return (
      <form noValidate className={MODAL_FORM} onSubmit={submit}>
         <ModalBody>
            <div className='grid gap-4'>
               <div className='grid gap-3 md:grid-cols-3'>
                  <Field label={t('Дата')}>
                     <input
                        className='field-input'
                        type='date'
                        value={value.date}
                        onChange={(event) => set('date', event.target.value)}
                     />
                  </Field>
                  <Field label={t('Рубрика')}>
                     <select
                        className='field-input'
                        value={value.category}
                        onChange={(event) =>
                           set('category', event.target.value as SiteCategory)
                        }
                     >
                        {SITE_CATEGORIES.map((category) => (
                           <option key={category} value={category}>
                              {t(CATEGORY_LABELS[category])}
                           </option>
                        ))}
                     </select>
                  </Field>
                  <Field label={t('На сайте')}>
                     <span className='flex h-9 items-center gap-2.5'>
                        <Switch
                           checked={value.published}
                           hint={t('Опубликована новость или пока черновик')}
                           label={t('На сайте')}
                           onChange={(next) => set('published', next)}
                        />
                        <span className='text-ink text-meta font-normal'>
                           {value.published ? t('Опубликована') : t('Черновик')}
                        </span>
                     </span>
                  </Field>
               </div>
               {press && (
                  <div className='grid gap-3 md:grid-cols-2'>
                     <Field label={t('Издание')}>
                        <input
                           className='field-input'
                           placeholder='Spot'
                           value={value.outlet}
                           onChange={(event) =>
                              set('outlet', event.target.value)
                           }
                        />
                     </Field>
                     <Field label={t('Ссылка на публикацию')}>
                        <input
                           className='field-input'
                           inputMode='url'
                           placeholder='https://'
                           value={value.url}
                           onChange={(event) => set('url', event.target.value)}
                        />
                     </Field>
                  </div>
               )}
               <FileField
                  hint={t(
                     'Без картинки сайт нарисует фирменную обложку рубрики.',
                  )}
                  kind='image'
                  label={t('Обложка')}
                  maxBytes={MAX_IMAGE_BYTES}
                  value={value.image}
                  onChange={(address) => set('image', address)}
               />
               <LangTabs
                  filled={filledIn(value.title)}
                  value={language}
                  onChange={setLanguage}
               />
               <Field
                  error={
                     tried && !titled
                        ? t('Напишите заголовок хотя бы на одном языке')
                        : undefined
                  }
                  label={t('Заголовок')}
               >
                  <input
                     data-autofocus
                     className='field-input'
                     value={value.title[language]}
                     onChange={(event) =>
                        set('title', {
                           ...value.title,
                           [language]: event.target.value,
                        })
                     }
                  />
               </Field>
               <Field
                  hint={t('Показывается в списке новостей.')}
                  label={t('Анонс')}
               >
                  <textarea
                     className='field-input'
                     rows={2}
                     value={value.excerpt[language]}
                     onChange={(event) =>
                        set('excerpt', {
                           ...value.excerpt,
                           [language]: event.target.value,
                        })
                     }
                  />
               </Field>
               <Field label={t('Текст новости')}>
                  <RichTextEditor
                     key={language}
                     label={t('Текст новости')}
                     value={value.body[language]}
                     onChange={(html) =>
                        setValue((known) => ({
                           ...known,
                           body: { ...known.body, [language]: html },
                        }))
                     }
                  />
               </Field>
            </div>
         </ModalBody>
         <ModalFooter
            note={t('Перевода нет? Сайт покажет этот текст на другом языке.')}
         >
            <Button
               hint={t('Закрыть окно, ничего не меняя')}
               variant='text'
               onClick={onClose}
            >
               {t('Отмена')}
            </Button>
            <Button
               hint={
                  value.published
                     ? t('Сохранить и сразу показать на сайте')
                     : t('Сохранить как черновик: посетители его не увидят')
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

const News = ({ news }: { news: SiteNews[] }) => {
   const { t } = useTranslation('site');
   const [editing, setEditing] = useState<SiteNews | null>(null);
   const [removing, setRemoving] = useState<SiteNews | null>(null);
   const [category, setCategory] = useState<SiteCategory | ''>('');
   const [status, setStatus] = useState<'' | 'published' | 'draft'>('');
   const [query, setQuery] = useState('');
   const showing = useSiteSave((id: string, shown: boolean) =>
      site.setShown('news', id, shown),
   );
   const needle = query.trim().toLowerCase();
   const shown = news.filter(
      (item) =>
         (!category || item.category === category) &&
         (!status || item.published === (status === 'published')) &&
         (!needle ||
            Object.values(item.title).some((title) =>
               title.toLowerCase().includes(needle),
            )),
   );

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
               ]}
               value={status}
               onChange={setStatus}
            />
            <span className='ml-auto flex items-center gap-3'>
               <OnSite path='/news' />
               <Button
                  hint={t('Написать новую новость')}
                  onClick={() => setEditing(site.newNews())}
               >
                  <Plus aria-hidden />
                  {t('Новая новость')}
               </Button>
            </span>
         </div>
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
                              onClick={() => setEditing(item)}
                           >
                              {firstOf(item.title)}
                           </button>
                           <div className='text-ink-faint mt-0.5 max-w-[56ch] truncate text-xs'>
                              {firstOf(item.excerpt)}
                           </div>
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
                           <ItemActions
                              icons
                              name={firstOf(item.title)}
                              onDelete={() => setRemoving(item)}
                              onEdit={() => setEditing(item)}
                           />
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
         <Modal
            open={editing !== null}
            size='wide'
            title={editing?.id ? t('Новость') : t('Новая новость')}
            onClose={() => setEditing(null)}
         >
            {editing && (
               <NewsDialog
                  news={editing}
                  slugs={news
                     .filter(({ id }) => id !== editing.id)
                     .map(({ slug }) => slug)}
                  onClose={() => setEditing(null)}
               />
            )}
         </Modal>
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
