import { useRights } from '@modules/Settings/hooks/rights';
import {
   Badge,
   Button,
   buttonClass,
   Card,
   ConfirmDialog,
   Field,
   ItemActions,
   Loading,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
   NoData,
   Notice,
   Segmented,
   Switch,
   Table,
   TD,
   TH,
} from '@shared/components';
import { SITE_PATH } from '@shared/constants';
import { useAction, useRefreshOnReturn } from '@shared/hooks';
import type { SiteNews } from '@shared/types/site.types';
import {
   NEWS_SOURCE_KINDS,
   type NewsSource,
   type NewsSourceKind,
} from '@shared/types/site.types';
import dayjs from 'dayjs';
import {
   ArrowRight,
   Newspaper,
   Plus,
   RefreshCw,
   SlidersHorizontal,
} from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { useSite, useSiteSave } from '../../hooks';
import site from '../../services';
import collector, {
   type CollectorState,
   DEFAULT_FOCUS,
   DEFAULT_NAMES,
   useCollector,
} from '../../services/collector';
import { isFound, NewsCard } from './NewsCard';

// Texts are keys of the "site" translations.
const KINDS = {
   rss: {
      label: 'RSS-лента',
      placeholder: 'https://www.spot.uz/ru/rss/',
      hint: 'Адрес RSS- или Atom-ленты издания.',
   },
   site: {
      label: 'Сайт',
      placeholder: 'https://www.gazeta.uz/ru/',
      hint: 'Главная страница или раздел сайта: его лента найдётся сама.',
   },
   telegram: {
      label: 'Telegram-канал',
      placeholder: '@spotuz',
      hint: 'Публичный канал: @имя или t.me/имя. Подписываться не нужно.',
   },
   google: {
      label: 'Поиск Google News',
      placeholder: 'стартап Узбекистан when:7d',
      hint: 'Слова поиска. Фраза в кавычках ищется целиком, when:7d — только за последнюю неделю.',
   },
} as const satisfies Record<
   NewsSourceKind,
   { label: string; placeholder: string; hint: string }
>;

const EVERY = [15, 30, 60, 180, 720] as const;

const time = (iso: string) => (iso ? dayjs(iso).format('DD.MM HH:mm') : '');

const SourceDialog = ({
   source,
   onClose,
}: {
   source: NewsSource;
   onClose: () => void;
}) => {
   const { t } = useTranslation('site');
   const [value, setValue] = useState(source);
   const [tried, setTried] = useState(false);
   const ready = Boolean(value.name.trim() && value.address.trim());
   const saving = useAction(() => collector.saveSource(value), {
      kind: source.id ? 'save' : 'create',
      success: source.id
         ? t('Источник сохранён')
         : t('Источник добавлен: сервер проверит его в течение минуты'),
   });
   const set = <K extends keyof NewsSource>(key: K, next: NewsSource[K]) =>
      setValue((known) => ({ ...known, [key]: next }));
   const kind = KINDS[value.kind];
   const submit = async (event: FormEvent) => {
      event.preventDefault();
      setTried(true);
      if (ready && (await saving.run())) onClose();
   };

   return (
      <form noValidate className={MODAL_FORM} onSubmit={submit}>
         <ModalBody>
            <div className='grid gap-4'>
               <div className='grid gap-3 md:grid-cols-2'>
                  <Field label={t('Тип')}>
                     <select
                        className='field-input'
                        value={value.kind}
                        onChange={(event) =>
                           set('kind', event.target.value as NewsSourceKind)
                        }
                     >
                        {NEWS_SOURCE_KINDS.map((option) => (
                           <option key={option} value={option}>
                              {t(KINDS[option].label)}
                           </option>
                        ))}
                     </select>
                  </Field>
                  <Field
                     error={
                        tried && !value.name.trim()
                           ? t('Напишите название')
                           : undefined
                     }
                     hint={t(
                        'Так источник будет назван на сайте, если у статьи нет своего издания.',
                     )}
                     label={t('Название')}
                  >
                     <input
                        data-autofocus
                        className='field-input'
                        placeholder='Spot.uz'
                        value={value.name}
                        onChange={(event) => set('name', event.target.value)}
                     />
                  </Field>
               </div>
               <Field
                  error={
                     tried && !value.address.trim()
                        ? t('Укажите адрес')
                        : undefined
                  }
                  hint={t(kind.hint)}
                  label={value.kind === 'google' ? t('Что искать') : t('Адрес')}
               >
                  <input
                     className='field-input'
                     inputMode={value.kind === 'google' ? 'text' : 'url'}
                     placeholder={kind.placeholder}
                     value={value.address}
                     onChange={(event) => set('address', event.target.value)}
                  />
               </Field>
               <Field
                  hint={t(
                     'Через запятую или с новой строки. Статья о рынке берётся, если её заголовок или анонс содержит одно из слов; пусто — берутся все статьи источника.',
                  )}
                  label={t('Ключевые слова')}
               >
                  <textarea
                     className='field-input'
                     disabled={value.mentionsOnly}
                     placeholder={t('стартап, венчур, инвест, раунд')}
                     rows={2}
                     value={value.keywords}
                     onChange={(event) => set('keywords', event.target.value)}
                  />
               </Field>
               <div className='grid gap-3 md:grid-cols-3'>
                  {(
                     [
                        [
                           'mentionsOnly',
                           'Только упоминания фонда',
                           'Для больших изданий: берутся только статьи, где назван фонд, — в «Пресса о нас».',
                        ],
                        [
                           'autoPublish',
                           'Публиковать сразу',
                           'Статьи этого источника появятся на сайте без проверки. Лучше включать только для проверенных источников.',
                        ],
                        [
                           'active',
                           'Включён',
                           'Выключенный источник не проверяется.',
                        ],
                     ] as const
                  ).map(([key, label, hint]) => (
                     <Field key={key} hint={t(hint)} label={t(label)}>
                        <span className='flex h-9 items-center'>
                           <Switch
                              checked={value[key]}
                              hint={t(hint)}
                              label={t(label)}
                              onChange={(next) => set(key, next)}
                           />
                        </span>
                     </Field>
                  ))}
               </div>
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
               hint={
                  ready
                     ? t('Сохранить источник')
                     : t('Напишите название и адрес')
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

// «Отбор»: the fund's names to find in articles, and its focus for Claude.
const PickingDialog = ({
   state,
   canEdit,
   onClose,
}: {
   state: CollectorState;
   canEdit: boolean;
   onClose: () => void;
}) => {
   const { t } = useTranslation('site');
   const [names, setNames] = useState(state.names || DEFAULT_NAMES);
   const [focus, setFocus] = useState(state.focus || DEFAULT_FOCUS);
   const saving = useAction(() => collector.saveSettings({ names, focus }));
   const submit = async (event: FormEvent) => {
      event.preventDefault();
      if (await saving.run()) onClose();
   };
   return (
      <form noValidate className={MODAL_FORM} onSubmit={submit}>
         <ModalBody>
            <div className='grid gap-4'>
               <Field
                  hint={t(
                     'По одному на строку. Статья, где названо одно из них, идёт в «Пресса о нас».',
                  )}
                  label={t('Названия фонда')}
               >
                  <textarea
                     data-autofocus
                     className='field-input'
                     disabled={!canEdit}
                     rows={4}
                     value={names}
                     onChange={(event) => setNames(event.target.value)}
                  />
               </Field>
               <Field
                  hint={t(
                     'Claude оставляет статьи, которые подходят под это описание. Без Claude не используется.',
                  )}
                  label={t('Фокус фонда')}
               >
                  <textarea
                     className='field-input'
                     disabled={!canEdit}
                     rows={4}
                     value={focus}
                     onChange={(event) => setFocus(event.target.value)}
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
            {canEdit && (
               <Button
                  hint={t('Сохранить настройки отбора')}
                  loading={saving.pending}
                  type='submit'
               >
                  {t('Сохранить')}
               </Button>
            )}
         </ModalFooter>
      </form>
   );
};

// What the collector found, by state: waiting, published, rejected.
type Shown = 'found' | 'published' | 'rejected';
const SHOWN_TEST: Record<Shown, (item: SiteNews) => boolean> = {
   found: isFound,
   published: (item) => item.collected && item.published,
   rejected: (item) => item.collected && item.rejected,
};
const CARDS_SHOWN = 12;

/* Настройки → Сбор новостей, in two parts: the collector (its state, how
   often it checks, «Отбор», «Проверить сейчас», and its sources), and what it
   found, as the website's cards, published or rejected here
   (services/collector.ts, docs/news.md). */
const NewsCollector = () => {
   const { t } = useTranslation('site');
   const navigate = useNavigate();
   const state = useCollector();
   const data = useSite();
   const asking = state?.asking ?? false;

   /* The server works on its own: its state and the news it found are read on
      opening the page, every few seconds while a check runs, every half
      minute otherwise, and on coming back to the tab. */
   useEffect(() => {
      const read = () =>
         Promise.all([collector.reload(), site.refreshNews()]).catch(
            (error: unknown) => console.error(error),
         );
      void read();
      const timer = window.setInterval(
         () => {
            if (document.visibilityState === 'visible') void read();
         },
         asking ? 4000 : 30000,
      );
      return () => window.clearInterval(timer);
   }, [asking]);
   useRefreshOnReturn(() =>
      Promise.all([collector.reload(), site.refreshNews()]),
   );
   const rights = useRights();
   const canEdit = rights('settings') === 'full';
   const canPublish = rights('site') === 'full';
   const [editing, setEditing] = useState<NewsSource | null>(null);
   const [removing, setRemoving] = useState<NewsSource | null>(null);
   const [removingNews, setRemovingNews] = useState<SiteNews | null>(null);
   const [picking, setPicking] = useState(false);
   const [shown, setShown] = useState<Shown>('found');
   const checking = useAction(() => collector.checkAll(), {
      success: t('Сервер проверит источники в течение минуты'),
   });
   const starting = useAction(() => collector.addStarters(), {
      kind: 'create',
      success: t('Источники добавлены: сервер проверит их в течение минуты'),
   });
   const checkingOne = useAction((id: string) => collector.checkSource(id), {
      success: t('Сервер проверит источник в течение минуты'),
   });
   const switching = useAction(
      (id: string, fields: Parameters<typeof collector.setSource>[1]) =>
         collector.setSource(id, fields),
      { success: false },
   );
   const timing = useAction((every: number) => collector.setEvery(every));
   const publishing = useSiteSave((id: string, published: boolean) =>
      site.setShown('news', id, published),
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

   if (!state) return <Loading />;
   if (!state.ready)
      return (
         <Notice warning>
            {t(
               'Таблиц сбора новостей ещё нет в ucode: их создаёт разработчик, batch 28 в docs/ucode-migration.md.',
            )}
         </Notice>
      );

   const collected = data?.news.filter(({ collected }) => collected) ?? [];
   const counts = {
      found: collected.filter(SHOWN_TEST.found).length,
      published: collected.filter(SHOWN_TEST.published).length,
      rejected: collected.filter(SHOWN_TEST.rejected).length,
   };
   const cards = collected
      .filter(SHOWN_TEST[shown])
      .sort((a, b) => (b.foundAt || b.date).localeCompare(a.foundAt || a.date));
   const status = state.running
      ? { label: t('Работает'), tone: 'success' as const }
      : state.seenAt
        ? {
             label: t('Не на связи с {{time}}', { time: time(state.seenAt) }),
             tone: 'warning' as const,
          }
        : { label: t('Сервер не запущен'), tone: 'neutral' as const };
   const openNews = (item: SiteNews) =>
      navigate(`${SITE_PATH}/news/${item.id}`);

   return (
      <div className='gap-section flex flex-col'>
         <Card
            action={
               <span className='flex flex-wrap items-center justify-end gap-2'>
                  <select
                     aria-label={t('Проверять каждый источник')}
                     className='field-input h-8 w-auto py-0 text-sm'
                     data-hint={t('Как часто сервер проверяет каждый источник')}
                     disabled={!canEdit || timing.pending}
                     value={state.every}
                     onChange={(event) =>
                        void timing.run(Number(event.target.value))
                     }
                  >
                     {(EVERY.includes(state.every as (typeof EVERY)[number])
                        ? EVERY
                        : [...EVERY, state.every].sort((a, b) => a - b)
                     ).map((minutes) => (
                        <option key={minutes} value={minutes}>
                           {minutes < 60
                              ? t('каждые {{n}} мин', { n: minutes })
                              : t('каждые {{n}} ч', { n: minutes / 60 })}
                        </option>
                     ))}
                  </select>
                  <Button
                     hint={t(
                        'Названия фонда и фокус фонда, по которым отбираются статьи',
                     )}
                     size='sm'
                     variant='ghost'
                     onClick={() => setPicking(true)}
                  >
                     <SlidersHorizontal aria-hidden />
                     {t('Отбор')}
                  </Button>
                  <Button
                     disabled={!canEdit || !state.running || state.asking}
                     hint={
                        !state.running
                           ? t(
                                'Сервер не на связи: проверка начнётся, когда он заработает',
                             )
                           : state.asking
                             ? t('Проверка уже запрошена')
                             : t(
                                  'Проверить все включённые источники сейчас, не дожидаясь расписания',
                               )
                     }
                     loading={checking.pending || state.asking}
                     size='sm'
                     onClick={() => void checking.run()}
                  >
                     <RefreshCw aria-hidden />
                     {state.asking ? t('Проверяется…') : t('Проверить сейчас')}
                  </Button>
               </span>
            }
            hint={
               <span className='flex flex-wrap items-center gap-1.5'>
                  <Badge tone={status.tone}>{status.label}</Badge>
                  <span
                     data-hint={
                        state.ai
                           ? t(
                                'Claude читает статьи, оставляет подходящие под фокус фонда и пишет анонс на трёх языках',
                             )
                           : t(
                                'Без ключа ANTHROPIC_API_KEY на сервере статьи отбираются по ключевым словам и названиям фонда',
                             )
                     }
                  >
                     <Badge tone={state.ai ? 'accent' : 'neutral'}>
                        {state.ai ? t('Claude') : t('По ключевым словам')}
                     </Badge>
                  </span>
                  {state.checkedAt && (
                     <span className='text-ink-faint text-xs font-normal'>
                        {t('Проверено {{time}}', {
                           time: time(state.checkedAt),
                        })}
                     </span>
                  )}
               </span>
            }
            icon={Newspaper}
            title={t('Новости для сайта')}
         >
            {state.aiError && (
               <div className='px-4.5 pt-3'>
                  <Notice warning>{state.aiError}</Notice>
               </div>
            )}
            <div className='flex items-center justify-between gap-3 px-4.5 pt-3.5 pb-2'>
               <span className='text-ink-strong text-meta font-semibold'>
                  {t('Источники')}{' '}
                  <span className='text-ink-faint font-normal tabular-nums'>
                     {state.sources.length}
                  </span>
               </span>
               {canEdit && state.sources.length > 0 && (
                  <Button
                     hint={t(
                        'Добавить сайт, RSS-ленту, Telegram-канал или поиск Google News',
                     )}
                     size='sm'
                     variant='ghost'
                     onClick={() => setEditing(collector.newSource())}
                  >
                     <Plus aria-hidden />
                     {t('Добавить источник')}
                  </Button>
               )}
            </div>
            {state.sources.length ? (
               <Table
                  head={
                     <>
                        <th className={TH}>{t('Источник')}</th>
                        <th className={TH}>{t('Отбор')}</th>
                        <th className={TH}>{t('Найдено')}</th>
                        <th className={TH}>{t('Проверка')}</th>
                        <th className={TH}>{t('Сразу на сайт')}</th>
                        <th className={TH}>{t('Включён')}</th>
                        <th className={TH} />
                     </>
                  }
               >
                  {state.sources.map((source) => (
                     <tr key={source.id}>
                        <td className={TD}>
                           <button
                              type='button'
                              className='text-left font-semibold'
                              data-hint={t('Открыть источник')}
                              disabled={!canEdit}
                              onClick={() => setEditing(source)}
                           >
                              {source.name}
                           </button>
                           <div className='text-ink-faint flex max-w-[44ch] items-center gap-1.5 text-xs'>
                              <span className='shrink-0'>
                                 {t(KINDS[source.kind].label)}
                              </span>
                              <span aria-hidden>·</span>
                              <span className='truncate'>{source.address}</span>
                           </div>
                        </td>
                        <td className={`${TD} text-meta max-w-[28ch]`}>
                           {source.mentionsOnly ? (
                              t('Только упоминания фонда')
                           ) : source.keywords ? (
                              <span className='line-clamp-2'>
                                 {source.keywords}
                              </span>
                           ) : (
                              t('Все статьи')
                           )}
                        </td>
                        <td className={`${TD} tabular-nums`}>
                           {source.foundCount}
                        </td>
                        <td className={`${TD} text-meta`}>
                           {source.error ? (
                              <span
                                 className='text-danger line-clamp-2 max-w-[30ch]'
                                 title={source.error}
                              >
                                 {source.error}
                              </span>
                           ) : source.checkedAt ? (
                              time(source.checkedAt)
                           ) : (
                              <span className='text-ink-faint'>
                                 {t('В очереди')}
                              </span>
                           )}
                        </td>
                        <td className={TD}>
                           <Switch
                              small
                              checked={source.autoPublish}
                              disabled={!canEdit || switching.pending}
                              hint={
                                 source.autoPublish
                                    ? t(
                                         'Статьи этого источника сразу на сайте. Выключить: сначала на проверку',
                                      )
                                    : t(
                                         'Публиковать статьи этого источника без проверки',
                                      )
                              }
                              label={source.name}
                              onChange={(next) =>
                                 void switching.run(source.id, {
                                    autoPublish: next,
                                 })
                              }
                           />
                        </td>
                        <td className={TD}>
                           <Switch
                              small
                              checked={source.active}
                              disabled={!canEdit || switching.pending}
                              hint={
                                 source.active
                                    ? t('Выключить источник')
                                    : t('Включить источник')
                              }
                              label={source.name}
                              onChange={(next) =>
                                 void switching.run(source.id, { active: next })
                              }
                           />
                        </td>
                        <td className={TD}>
                           {canEdit && (
                              <span className='flex items-center justify-end gap-1'>
                                 <button
                                    type='button'
                                    aria-label={t('Проверить: {{name}}', {
                                       name: source.name,
                                    })}
                                    className='text-ink-soft hover:bg-ground grid size-7 place-items-center rounded-md'
                                    data-hint={t(
                                       'Проверить этот источник в течение минуты',
                                    )}
                                    disabled={checkingOne.pending}
                                    onClick={() =>
                                       void checkingOne.run(source.id)
                                    }
                                 >
                                    <RefreshCw aria-hidden className='size-4' />
                                 </button>
                                 <ItemActions
                                    icons
                                    name={source.name}
                                    onDelete={() => setRemoving(source)}
                                    onEdit={() => setEditing(source)}
                                 />
                              </span>
                           )}
                        </td>
                     </tr>
                  ))}
               </Table>
            ) : (
               <NoData>
                  <span className='flex flex-col items-center gap-3'>
                     {t('Источников пока нет.')}
                     {canEdit && (
                        <span className='flex flex-wrap justify-center gap-2'>
                           <Button
                              hint={t(
                                 'Добавить пять рекомендуемых источников; их можно изменить или удалить',
                              )}
                              loading={starting.pending}
                              size='sm'
                              onClick={() => void starting.run()}
                           >
                              {t('Добавить рекомендуемые')}
                           </Button>
                           <Button
                              hint={t(
                                 'Добавить сайт, RSS-ленту, Telegram-канал или поиск Google News',
                              )}
                              size='sm'
                              variant='ghost'
                              onClick={() => setEditing(collector.newSource())}
                           >
                              <Plus aria-hidden />
                              {t('Добавить источник')}
                           </Button>
                        </span>
                     )}
                  </span>
               </NoData>
            )}
         </Card>

         <Card
            action={
               <span className='flex flex-wrap items-center justify-end gap-2'>
                  <Segmented
                     items={[
                        {
                           id: 'found',
                           label: t('Ждут проверки: {{count}}', {
                              count: counts.found,
                           }),
                        },
                        {
                           id: 'published',
                           label: t('На сайте: {{count}}', {
                              count: counts.published,
                           }),
                        },
                        {
                           id: 'rejected',
                           label: t('Отклонены: {{count}}', {
                              count: counts.rejected,
                           }),
                        },
                     ]}
                     label={t('Какие найденные новости показать')}
                     value={shown}
                     onChange={setShown}
                  />
                  <Link
                     className={buttonClass('ghost', undefined, false, 'sm')}
                     data-hint={t(
                        'Открыть все новости сайта в «Сайт → Новости»',
                     )}
                     to={`${SITE_PATH}/news`}
                  >
                     {t('Все новости')}
                     <ArrowRight aria-hidden />
                  </Link>
               </span>
            }
            title={t('Найденные новости')}
         >
            {cards.length ? (
               <div className='grid gap-4 p-4.5 sm:grid-cols-2 xl:grid-cols-3'>
                  {cards.slice(0, CARDS_SHOWN).map((item) => (
                     <NewsCard
                        key={item.id}
                        item={item}
                        publishing={publishing.pending}
                        readOnly={!canPublish}
                        rejecting={rejecting.pending}
                        onDelete={() => setRemovingNews(item)}
                        onOpen={() => openNews(item)}
                        onPublish={(next) => void publishing.run(item.id, next)}
                        onReject={(one, rejected) =>
                           void rejecting.run(one, rejected)
                        }
                     />
                  ))}
                  {cards.length > CARDS_SHOWN && (
                     <Link
                        className='border-line text-accent hover:bg-accent-tint grid min-h-40 place-items-center rounded-xl border border-dashed font-semibold'
                        data-hint={t(
                           'Открыть все найденные в «Сайт → Новости»',
                        )}
                        to={`${SITE_PATH}/news?status=found`}
                     >
                        {t('Ещё {{count}} в «Сайт → Новости»', {
                           count: cards.length - CARDS_SHOWN,
                        })}
                     </Link>
                  )}
               </div>
            ) : (
               <NoData>
                  {shown === 'found'
                     ? state.sources.length
                        ? t(
                             'Новых статей нет: сервер проверит источники по расписанию.',
                          )
                        : t(
                             'Добавьте источники — найденные статьи появятся здесь.',
                          )
                     : t('Таких новостей нет')}
               </NoData>
            )}
         </Card>

         <Modal
            open={editing !== null}
            size='wide'
            title={
               editing?.id
                  ? t('Источник новостей')
                  : t('Новый источник новостей')
            }
            onClose={() => setEditing(null)}
         >
            {editing && (
               <SourceDialog
                  source={editing}
                  onClose={() => setEditing(null)}
               />
            )}
         </Modal>
         <Modal
            open={picking}
            title={t('Отбор новостей')}
            onClose={() => setPicking(false)}
         >
            {picking && (
               <PickingDialog
                  canEdit={canEdit}
                  state={state}
                  onClose={() => setPicking(false)}
               />
            )}
         </Modal>
         <ConfirmDialog
            open={removing !== null}
            subtitle={removing?.name}
            success={t('Источник удалён')}
            title={t('Удалить источник?')}
            onClose={() => setRemoving(null)}
            onConfirm={() => removing && collector.removeSource(removing.id)}
         >
            <p>
               {t(
                  'Он больше не будет проверяться. Уже найденные из него новости останутся.',
               )}
            </p>
         </ConfirmDialog>
         <ConfirmDialog
            open={removingNews !== null}
            subtitle={
               removingNews
                  ? removingNews.title.ru ||
                    removingNews.title.en ||
                    removingNews.title.uz
                  : undefined
            }
            success={t('Новость удалена')}
            title={t('Удалить новость?')}
            onClose={() => setRemovingNews(null)}
            onConfirm={() =>
               removingNews && site.remove('news', removingNews.id)
            }
         >
            <p>{t('Она пропадёт с сайта, вернуть её будет нельзя.')}</p>
         </ConfirmDialog>
      </div>
   );
};

export default NewsCollector;
