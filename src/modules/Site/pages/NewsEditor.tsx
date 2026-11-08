import { useRights } from '@modules/Settings/hooks/rights';
import {
   ArticleText,
   Badge,
   Button,
   Card,
   ConfirmDialog,
   Field,
   Loading,
   Notice,
   PageBody,
   PageHeader,
   RichTextEditor,
   Switch,
} from '@shared/components';
import { SITE_PATH } from '@shared/constants';
import { formatDate } from '@shared/helpers';
import { toast } from '@shared/helpers/toast';
import { useAction, useTeamStatus } from '@shared/hooks';
import {
   LINKED_CATEGORIES,
   SITE_CATEGORIES,
   type SiteCategory,
   type SiteLanguage,
   type SiteNews,
} from '@shared/types/site.types';
import {
   ArrowLeft,
   ArrowUpRight,
   Ban,
   ClipboardPaste,
   Eye,
   PencilLine,
   Trash2,
   Undo2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { CATEGORY_LABELS, MAX_IMAGE_BYTES } from '../constants';
import { filledIn, firstOf, slugOf } from '../helpers';
import { useSite } from '../hooks';
import site from '../services';
import { FileField, LangTabs } from './components/parts';

const LIST = `${SITE_PATH}/news`;

const same = (a: SiteNews, b: SiteNews) =>
   JSON.stringify(a) === JSON.stringify(b);

// A picture put into the text: stored in ucode Files at once, its address kept.
const useUpload = () => {
   const { t } = useTranslation('site');
   return async (file: File) => {
      if (file.size > MAX_IMAGE_BYTES) {
         toast.error(t('Картинка больше 5 МБ: уменьшите её и вставьте снова'));
         throw new Error('too big');
      }
      try {
         return (await site.uploadFile(file)).url;
      } catch (error) {
         toast.error(t('Не удалось загрузить картинку'));
         throw error;
      }
   };
};

/* The article, written: the news of one language as the site's article page
   shows it (cover, date and section, title, lead, text). */
const Preview = ({
   news,
   language,
}: {
   news: SiteNews;
   language: SiteLanguage;
}) => {
   const { t } = useTranslation('site');
   // the site shows another language where this one has no text
   const text = (field: 'title' | 'excerpt' | 'body') =>
      news[field][language] ||
      news[field].en ||
      news[field].ru ||
      news[field].uz;
   return (
      <article className='mx-auto max-w-[44rem]'>
         {news.image ? (
            <img
               alt=''
               className='mb-5 aspect-video w-full rounded-xl object-cover'
               src={news.image}
            />
         ) : (
            <div className='bg-accent-tint text-accent mb-5 grid aspect-video w-full place-items-center rounded-xl text-sm font-semibold'>
               {t('Без обложки сайт нарисует фирменную обложку рубрики.')}
            </div>
         )}
         <p className='text-ink-faint text-meta mb-2 flex flex-wrap gap-2'>
            <span className='bg-accent-tint text-accent-strong rounded-full px-2 font-semibold'>
               {LINKED_CATEGORIES.includes(news.category) && news.outlet
                  ? news.outlet
                  : t(CATEGORY_LABELS[news.category])}
            </span>
            {news.date && <span>{formatDate(news.date)}</span>}
         </p>
         <h1 className='text-ink-strong mb-3 text-2xl leading-tight font-bold'>
            {text('title') || t('Без заголовка')}
         </h1>
         {text('excerpt') && (
            <p className='text-ink-soft mb-5 text-base'>{text('excerpt')}</p>
         )}
         <ArticleText html={text('body') || `<p>${text('excerpt')}</p>`} />
         {LINKED_CATEGORIES.includes(news.category) && news.url && (
            <p className='mt-5'>
               <a
                  className='link inline-flex items-center gap-1'
                  href={news.url}
                  rel='noreferrer'
                  target='_blank'
               >
                  {t('Читать в издании')}
                  <ArrowUpRight aria-hidden className='size-3.5' />
               </a>
            </p>
         )}
      </article>
   );
};

/* The source's text for the news item itself, as the server puts it in: its
   first picture left out when the news item has a cover, which is that
   picture already and which the site shows above the text. */
const bodyOf = (original: string, cover: string) =>
   cover
      ? original.replace(
           /^<figure class="image"><img [^>]*>(?:<figcaption>[\s\S]*?<\/figcaption>)?<\/figure>\n?/,
           '',
        )
      : original;

const Editor = ({
   initial,
   live,
   slugs,
}: {
   initial: SiteNews;
   live: SiteNews; // as stored now: the source's text comes in while it is open
   slugs: string[];
}) => {
   const { t } = useTranslation('site');
   const navigate = useNavigate();
   const upload = useUpload();
   const [saved, setSaved] = useState(initial);
   const [value, setValue] = useState(initial);
   // a collected article opens in its own language
   const [language, setLanguage] = useState<SiteLanguage>(
      filledIn(initial.title)[0] ?? 'ru',
   );
   const [replacing, setReplacing] = useState(false);
   // the editor is built again when the source's text is put in
   const [inserted, setInserted] = useState(0);
   const [preview, setPreview] = useState(false);
   const [tried, setTried] = useState(false);
   const [leaving, setLeaving] = useState(false);
   const [removing, setRemoving] = useState(false);
   const dirty = !same(value, saved);
   const titled = Boolean(firstOf(value.title).trim());
   const linked = LINKED_CATEGORIES.includes(value.category);
   const found = value.collected && !value.published && !value.rejected;

   /* The server puts a collected article's text into «Текст новости» as it
      reads it: what it wrote comes in while the page is open, unless the
      news item is being edited. */
   useEffect(() => {
      if (dirty || same(live, saved)) return;
      setSaved(live);
      setValue(live);
      setInserted((count) => count + 1);
      // eslint-disable-next-line react-hooks/exhaustive-deps -- on the stored news only
   }, [live]);

   // closing the tab with changes asks first
   useEffect(() => {
      if (!dirty) return;
      const warn = (event: BeforeUnloadEvent) => event.preventDefault();
      window.addEventListener('beforeunload', warn);
      return () => window.removeEventListener('beforeunload', warn);
   }, [dirty]);

   const set = <K extends keyof SiteNews>(key: K, next: SiteNews[K]) =>
      setValue((known) => ({ ...known, [key]: next }));

   const saving = useAction(
      async (published: boolean) => {
         const next: SiteNews = {
            ...value,
            published,
            rejected: published ? false : value.rejected,
            slug:
               value.slug ||
               slugOf(
                  value.title.en || value.title.ru || value.title.uz,
                  slugs,
               ),
         };
         if (published && next.rejected !== value.rejected)
            await site.reject(next.id, false);
         const id = await site.save('news', next);
         const stored = { ...next, id };
         setSaved(stored);
         setValue(stored);
         if (!value.id) navigate(`${LIST}/${id}`, { replace: true });
      },
      {
         success: (published) =>
            published
               ? value.published
                  ? t('Сохранено и уже на сайте')
                  : t('Новость опубликована на сайте')
               : value.published
                 ? t('Новость снята с сайта: теперь это черновик')
                 : t('Черновик сохранён: посетители его не видят'),
      },
   );
   const save = (published: boolean) => {
      setTried(true);
      if (!titled) {
         toast.error(t('Напишите заголовок хотя бы на одном языке'));
         return;
      }
      void saving.run(published);
   };
   const rejecting = useAction(
      async (rejected: boolean) => {
         await site.reject(value.id, rejected);
         const next = {
            ...saved,
            rejected,
            published: rejected ? false : saved.published,
         };
         setSaved(next);
         setValue((known) => ({
            ...known,
            rejected,
            published: next.published,
         }));
      },
      {
         success: (rejected) =>
            rejected
               ? t('Новость отклонена: сборщик её больше не принесёт')
               : t('Новость возвращена в найденные'),
      },
   );

   const status = value.rejected
      ? { label: t('Отклонена'), tone: 'danger' as const }
      : saved.published
        ? { label: t('Опубликована'), tone: 'success' as const }
        : found
          ? { label: t('Найдено'), tone: 'accent' as const }
          : { label: t('Черновик'), tone: 'neutral' as const };
   const address = `/news/${value.slug || value.id}`;

   const back = () => (dirty ? setLeaving(true) : navigate(LIST));

   // the source's text into this language's text again: at once if it is empty
   const putSource = () => {
      setValue((known) => ({
         ...known,
         body: {
            ...known.body,
            [language]: bodyOf(live.original, known.image),
         },
      }));
      setInserted((count) => count + 1);
   };
   const insertSource = () =>
      value.body[language].replace(/<[^>]+>/g, '').trim()
         ? setReplacing(true)
         : putSource();

   return (
      <>
         <PageHeader
            actions={
               <>
                  <Button
                     hint={
                        preview
                           ? t('Вернуться к редактированию')
                           : t(
                                'Посмотреть, как новость будет выглядеть на сайте',
                             )
                     }
                     variant='ghost'
                     onClick={() => setPreview(!preview)}
                  >
                     {preview ? (
                        <PencilLine aria-hidden />
                     ) : (
                        <Eye aria-hidden />
                     )}
                     {preview ? t('Редактировать') : t('Предпросмотр')}
                  </Button>
                  {saved.published ? (
                     <>
                        <Button
                           hint={t(
                              'Убрать новость с сайта и оставить черновиком',
                           )}
                           loading={saving.pending}
                           variant='ghost'
                           onClick={() => save(false)}
                        >
                           {t('Снять с сайта')}
                        </Button>
                        <Button
                           disabled={!dirty}
                           hint={
                              dirty
                                 ? t(
                                      'Сохранить изменения: на сайте они появятся сразу',
                                   )
                                 : t('Изменений нет')
                           }
                           loading={saving.pending}
                           onClick={() => save(true)}
                        >
                           {t('Сохранить')}
                        </Button>
                     </>
                  ) : (
                     <>
                        <Button
                           disabled={!dirty && !!value.id}
                           hint={t(
                              'Сохранить как черновик: посетители его не увидят',
                           )}
                           loading={saving.pending}
                           variant='ghost'
                           onClick={() => save(false)}
                        >
                           {t('Сохранить черновик')}
                        </Button>
                        <Button
                           hint={t('Сохранить и сразу показать на сайте')}
                           loading={saving.pending}
                           onClick={() => save(true)}
                        >
                           {t('Опубликовать')}
                        </Button>
                     </>
                  )}
               </>
            }
            badge={<Badge tone={status.tone}>{status.label}</Badge>}
            label={value.id ? t('Новость') : t('Новая новость')}
            section={
               <Link className='hover:text-ink' to={LIST}>
                  {t('Новости')}
               </Link>
            }
            title={firstOf(value.title) || t('Новая новость')}
         />
         <PageBody>
            <button
               type='button'
               className='text-ink-soft hover:text-ink text-meta mb-4 inline-flex items-center gap-1.5 font-semibold'
               data-hint={t('Вернуться к списку новостей')}
               onClick={back}
            >
               <ArrowLeft aria-hidden className='size-4' />
               {t('Все новости')}
            </button>
            <div className='grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]'>
               <div className='grid min-w-0 gap-4'>
                  <Card className='min-w-0 p-4.5'>
                     <LangTabs
                        filled={filledIn(value.title)}
                        value={language}
                        onChange={setLanguage}
                     />
                     {preview ? (
                        <div className='pt-6 pb-2'>
                           <Preview language={language} news={value} />
                        </div>
                     ) : (
                        <div className='grid gap-4 pt-4'>
                           <Field
                              error={
                                 tried && !titled
                                    ? t(
                                         'Напишите заголовок хотя бы на одном языке',
                                      )
                                    : undefined
                              }
                              label={t('Заголовок')}
                           >
                              <input
                                 data-autofocus
                                 className='field-input text-base font-semibold'
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
                              hint={t(
                                 'Показывается в списке новостей и под заголовком статьи.',
                              )}
                              label={t('Анонс')}
                           >
                              <textarea
                                 className='field-input'
                                 rows={3}
                                 value={value.excerpt[language]}
                                 onChange={(event) =>
                                    set('excerpt', {
                                       ...value.excerpt,
                                       [language]: event.target.value,
                                    })
                                 }
                              />
                           </Field>
                           {linked && (
                              <Notice>
                                 {t(
                                    'Карточка этой рубрики на сайте открывает статью в издании. Текст ниже виден, только если открыть новость по её адресу на сайте.',
                                 )}
                              </Notice>
                           )}
                           <Field
                              hint={t(
                                 'Заголовки, цитаты, картинки (вставьте или перетащите файл до 5 МБ), видео YouTube по ссылке, таблицы.',
                              )}
                              label={t('Текст новости')}
                           >
                              <div className='article-editor'>
                                 <RichTextEditor
                                    key={`${language}:${inserted}`}
                                    article={{ onUpload: upload }}
                                    label={t('Текст новости')}
                                    value={value.body[language]}
                                    onChange={(html) =>
                                       setValue((known) => ({
                                          ...known,
                                          body: {
                                             ...known.body,
                                             [language]: html,
                                          },
                                       }))
                                    }
                                 />
                              </div>
                           </Field>
                           <p className='text-ink-faint text-meta'>
                              {t(
                                 'Перевода нет? Сайт покажет этот текст на другом языке.',
                              )}
                           </p>
                        </div>
                     )}
                  </Card>
               </div>

               <div className='grid gap-4'>
                  <Card className='grid gap-4 p-4.5' title={t('Публикация')}>
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
                              set(
                                 'category',
                                 event.target.value as SiteCategory,
                              )
                           }
                        >
                           {SITE_CATEGORIES.map((category) => (
                              <option key={category} value={category}>
                                 {t(CATEGORY_LABELS[category])}
                              </option>
                           ))}
                        </select>
                     </Field>
                     {linked && (
                        <>
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
                                 onChange={(event) =>
                                    set('url', event.target.value)
                                 }
                              />
                           </Field>
                        </>
                     )}
                     <FileField
                        hint={t(
                           'Без картинки сайт нарисует фирменную обложку рубрики.',
                        )}
                        kind='image'
                        label={t('Обложка')}
                        maxBytes={MAX_IMAGE_BYTES}
                        value={value.image}
                        onChange={(next) => set('image', next)}
                     />
                     <Field
                        hint={t(
                           'Часть адреса новости на сайте. Пусто — составится из заголовка при сохранении.',
                        )}
                        label={t('Адрес на сайте')}
                     >
                        <span className='flex items-center gap-1'>
                           <span className='text-ink-faint text-meta shrink-0'>
                              /news/
                           </span>
                           <input
                              className='field-input'
                              placeholder={slugOf(
                                 firstOf(value.title) || 'news',
                                 slugs,
                              )}
                              value={value.slug}
                              onChange={(event) =>
                                 set(
                                    'slug',
                                    event.target.value
                                       .toLowerCase()
                                       .replace(/[^a-z0-9-]+/g, '-'),
                                 )
                              }
                           />
                        </span>
                     </Field>
                     {saved.published && value.id && (
                        <a
                           className='link text-meta inline-flex items-center gap-1'
                           data-hint={t(
                              'Открыть новость на сайте в новой вкладке',
                           )}
                           href={site.pageUrl(address, language)}
                           rel='noreferrer'
                           target='_blank'
                        >
                           {t('Открыть на сайте')}
                           <ArrowUpRight aria-hidden className='size-3.5' />
                        </a>
                     )}
                  </Card>

                  {value.collected && (
                     <Card
                        className='grid gap-3 p-4.5'
                        title={t('Найдено сборщиком')}
                     >
                        {value.url && (
                           <a
                              className='link text-meta inline-flex items-center gap-1'
                              data-hint={t('Открыть статью в издании')}
                              href={value.url}
                              rel='noreferrer'
                              target='_blank'
                           >
                              {value.outlet || t('Оригинал')}
                              <ArrowUpRight aria-hidden className='size-3.5' />
                           </a>
                        )}
                        {value.note && (
                           <p className='text-ink-soft text-meta'>
                              {value.note}
                           </p>
                        )}
                        {value.foundAt && (
                           <p className='text-ink-faint text-meta'>
                              {t('Найдено {{date}}', {
                                 date: formatDate(value.foundAt),
                              })}
                           </p>
                        )}
                        <p className='text-ink-soft text-meta'>
                           {live.original
                              ? t(
                                   'Текст и картинки статьи взяты из источника в «Текст новости».',
                                )
                              : !live.originalAt
                                ? t(
                                     'Сервер ещё читает статью: текст и картинки появятся в «Текст новости» в течение минуты.',
                                  )
                                : /news\.google\./.test(live.url)
                                  ? t(
                                       'Google News открывает статью только в браузере, поэтому её текст получить нельзя: есть только заголовок и ссылка.',
                                    )
                                  : t(
                                       'Текст статьи получить не удалось. Откройте её по ссылке.',
                                    )}
                        </p>
                        {live.original && (
                           <Button
                              className='justify-self-start'
                              hint={t(
                                 'Снова взять текст и картинки статьи в «Текст новости» на этом языке',
                              )}
                              size='sm'
                              variant='ghost'
                              onClick={insertSource}
                           >
                              <ClipboardPaste aria-hidden />
                              {t('Взять текст из источника')}
                           </Button>
                        )}
                        {!value.published && value.id && (
                           <Button
                              hint={
                                 value.rejected
                                    ? t('Вернуть новость в найденные')
                                    : t(
                                         'Отклонить: новость не попадёт на сайт, и сборщик её больше не принесёт',
                                      )
                              }
                              loading={rejecting.pending}
                              size='sm'
                              variant='ghost'
                              onClick={() =>
                                 void rejecting.run(!value.rejected)
                              }
                           >
                              {value.rejected ? (
                                 <Undo2 aria-hidden />
                              ) : (
                                 <Ban aria-hidden />
                              )}
                              {value.rejected
                                 ? t('Вернуть в найденные')
                                 : t('Отклонить')}
                           </Button>
                        )}
                     </Card>
                  )}

                  {value.id && (
                     <Button
                        className='justify-self-start'
                        hint={t(
                           'Удалить новость: она пропадёт с сайта, вернуть её будет нельзя',
                        )}
                        size='sm'
                        variant='danger'
                        onClick={() => setRemoving(true)}
                     >
                        <Trash2 aria-hidden />
                        {t('Удалить новость')}
                     </Button>
                  )}
               </div>
            </div>
         </PageBody>

         <ConfirmDialog
            confirmLabel={t('Заменить')}
            open={replacing}
            success={t(
               'Текст из источника вставлен: отредактируйте его и сохраните',
            )}
            title={t('Заменить текст новости?')}
            onClose={() => setReplacing(false)}
            onConfirm={putSource}
         >
            <p>
               {t(
                  'Текст на этом языке заменится текстом из источника. До сохранения это можно отменить, уйдя без сохранения.',
               )}
            </p>
         </ConfirmDialog>
         <ConfirmDialog
            confirmLabel={t('Уйти без сохранения')}
            open={leaving}
            success={t('Изменения не сохранены')}
            title={t('Уйти без сохранения?')}
            onClose={() => setLeaving(false)}
            onConfirm={() => navigate(LIST)}
         >
            <p>{t('Изменения в этой новости пропадут.')}</p>
         </ConfirmDialog>
         <ConfirmDialog
            open={removing}
            subtitle={firstOf(value.title)}
            success={t('Новость удалена')}
            title={t('Удалить новость?')}
            onClose={() => setRemoving(false)}
            onConfirm={async () => {
               await site.remove('news', value.id);
               navigate(LIST, { replace: true });
            }}
         >
            <p>{t('Она пропадёт с сайта, вернуть её будет нельзя.')}</p>
         </ConfirmDialog>
      </>
   );
};

/* Сайт → Новости → a news on its own page (`/site/news/new`, `/site/news/:id`):
   the article written in full in each language, with pictures, video and
   tables in its text, its preview as the site shows it, and its publication. */
const NewsEditor = () => {
   const { t } = useTranslation('site');
   const { id = 'new' } = useParams();
   const data = useSite();
   const team = useTeamStatus();
   const editor = useRights()('site') === 'full';
   const current = data?.news.find((item) => item.id === id);
   const reading = !!current?.collected && !current.originalAt;

   // the server reads a collected article's text a few at a time: look again
   useEffect(() => {
      if (!reading) return;
      const timer = window.setInterval(() => {
         void site
            .refreshNews()
            .catch((error: unknown) => console.error(error));
      }, 8000);
      return () => window.clearInterval(timer);
   }, [reading]);

   if (!editor && team !== 'loading')
      return (
         <PageBody className='pt-5'>
            <Notice>
               {t(
                  'Сайт вам закрыт: право на него даёт директор в Настройках → Роли.',
               )}
            </Notice>
         </PageBody>
      );
   if (!data) return <Loading />;
   const news =
      id === 'new' ? site.newNews() : data.news.find((item) => item.id === id);
   if (!news)
      return (
         <PageBody className='pt-5'>
            <Notice warning>
               {t('Такой новости нет: её удалили или ссылка неверная.')}{' '}
               <Link className='link' to={LIST}>
                  {t('Все новости')}
               </Link>
            </Notice>
         </PageBody>
      );
   return (
      <Editor
         key={id === 'new' ? 'new' : news.id}
         initial={news}
         live={news}
         slugs={data.news
            .filter((item) => item.id !== news.id)
            .map(({ slug }) => slug)}
      />
   );
};

export default NewsEditor;
