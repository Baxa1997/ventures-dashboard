import { Badge, Button, ItemActions } from '@shared/components';
import { formatDate } from '@shared/helpers';
import {
   LINKED_CATEGORIES,
   type SiteCategory,
   type SiteNews,
} from '@shared/types/site.types';
import {
   ArrowUpRight,
   Ban,
   Briefcase,
   CalendarDays,
   Landmark,
   type LucideIcon,
   Newspaper,
   TrendingUp,
   Undo2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CATEGORY_LABELS } from '../../constants';
import { filledIn, firstOf } from '../../helpers';
import { LangMarks } from './parts';

/* A news item of the website as a card: in Сайт → Новости (the card view) and
   in Настройки → Сбор новостей (what the collector found). */

// Brought by the news collector, and nobody has published or rejected it yet.
export const isFound = (item: SiteNews) =>
   item.collected && !item.published && !item.rejected;

// A news item's state, as its badge says it.
export const stateOf = (item: SiteNews) =>
   item.rejected
      ? ({ label: 'Отклонена', tone: 'danger' } as const)
      : item.published
        ? ({ label: 'Опубликована', tone: 'success' } as const)
        : isFound(item)
          ? ({ label: 'Найдено', tone: 'accent' } as const)
          : ({ label: 'Черновик', tone: 'neutral' } as const);

// The site's cover for a news item without a picture, by its section.
const COVER_ICONS: Record<SiteCategory, LucideIcon> = {
   Fund: Landmark,
   Portfolio: Briefcase,
   Events: CalendarDays,
   Market: TrendingUp,
   Press: Newspaper,
};

// «Отклонить» on a collected draft, or «Вернуть» on a rejected one.
export const RejectButton = ({
   item,
   pending,
   onReject,
}: {
   item: SiteNews;
   pending: boolean;
   onReject: (item: SiteNews, rejected: boolean) => void;
}) => {
   const { t } = useTranslation('site');
   if (!item.collected || item.published) return null;
   return (
      <button
         type='button'
         aria-label={
            item.rejected
               ? t('Вернуть: {{name}}', { name: firstOf(item.title) })
               : t('Отклонить: {{name}}', { name: firstOf(item.title) })
         }
         className='text-ink-soft hover:bg-ground grid size-7 place-items-center rounded-md'
         data-hint={
            item.rejected
               ? t('Вернуть новость в найденные')
               : t(
                    'Отклонить: новость не попадёт на сайт, и сборщик её больше не принесёт',
                 )
         }
         disabled={pending}
         onClick={() => onReject(item, !item.rejected)}
      >
         {item.rejected ? (
            <Undo2 aria-hidden className='size-4' />
         ) : (
            <Ban aria-hidden className='size-4' />
         )}
      </button>
   );
};

interface ItemProps {
   item: SiteNews;
   onOpen: () => void;
   onDelete: () => void;
   onPublish: (published: boolean) => void;
   publishing: boolean;
   onReject: (item: SiteNews, rejected: boolean) => void;
   rejecting: boolean;
   readOnly?: boolean; // shown only: no switch, rejecting or deleting
}

/* The buttons along a card's bottom, the same in both cards and on one line:
   the one action the news item's state needs on the left («Опубликовать», and
   «Отклонить» for a found one; «Снять с сайта»; «Вернуть»), its languages, the
   original and edit/delete on the right. */
const CardActions = ({
   item,
   onOpen,
   onDelete,
   onPublish,
   publishing,
   onReject,
   rejecting,
   readOnly = false,
}: ItemProps) => {
   const { t } = useTranslation('site');
   const linked = LINKED_CATEGORIES.includes(item.category);
   const title = firstOf(item.title) || t('Без заголовка');
   return (
      <div className='border-line mt-auto flex items-center gap-1.5 border-t px-3.5 py-2 whitespace-nowrap'>
         {!readOnly &&
            (item.rejected ? (
               <Button
                  disabled={rejecting}
                  hint={t('Вернуть новость в найденные')}
                  size='sm'
                  variant='ghost'
                  onClick={() => onReject(item, false)}
               >
                  <Undo2 aria-hidden />
                  {t('Вернуть')}
               </Button>
            ) : item.published ? (
               <Button
                  disabled={publishing}
                  hint={t('Снять новость с сайта')}
                  size='sm'
                  variant='ghost'
                  onClick={() => onPublish(false)}
               >
                  {t('Снять с сайта')}
               </Button>
            ) : (
               <>
                  <Button
                     disabled={publishing}
                     hint={t('Опубликовать новость на сайте')}
                     size='sm'
                     onClick={() => onPublish(true)}
                  >
                     {t('Опубликовать')}
                  </Button>
                  {item.collected && (
                     <Button
                        disabled={rejecting}
                        hint={t(
                           'Отклонить: новость не попадёт на сайт, и сборщик её больше не принесёт',
                        )}
                        size='sm'
                        variant='ghost'
                        onClick={() => onReject(item, true)}
                     >
                        <Ban aria-hidden />
                        {t('Отклонить')}
                     </Button>
                  )}
               </>
            ))}
         <span className='ml-auto flex shrink-0 items-center gap-0.5'>
            <LangMarks filled={filledIn(item.title)} />
            {linked && item.url && (
               <a
                  aria-label={t('Открыть статью в издании')}
                  className='text-ink-soft hover:bg-ground grid size-7 place-items-center rounded-md'
                  data-hint={t('Открыть статью в издании')}
                  href={item.url}
                  rel='noreferrer'
                  target='_blank'
               >
                  <ArrowUpRight aria-hidden className='size-4' />
               </a>
            )}
            {!readOnly && (
               <ItemActions
                  icons
                  name={title}
                  onDelete={onDelete}
                  onEdit={onOpen}
               />
            )}
         </span>
      </div>
   );
};

// A news item as a card, as the site's news page shows it.
export const NewsCard = ({
   item,
   onOpen,
   onDelete,
   onPublish,
   publishing,
   onReject,
   rejecting,
   readOnly = false,
}: ItemProps) => {
   const { t } = useTranslation('site');
   const state = stateOf(item);
   const Icon = COVER_ICONS[item.category];
   const linked = LINKED_CATEGORIES.includes(item.category);
   return (
      <article className='border-line group flex flex-col overflow-hidden rounded-xl border bg-white'>
         <button
            type='button'
            className='bg-accent-tint relative block aspect-video w-full overflow-hidden'
            data-hint={t('Открыть новость')}
            onClick={onOpen}
         >
            {item.image ? (
               <img
                  alt=''
                  className='size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]'
                  loading='lazy'
                  src={item.image}
               />
            ) : (
               <span className='text-accent grid size-full place-items-center'>
                  <Icon aria-hidden className='size-10 opacity-80' />
               </span>
            )}
            <span className='absolute top-2.5 left-2.5'>
               <Badge tone={state.tone}>{t(state.label)}</Badge>
            </span>
         </button>
         <div className='flex flex-1 flex-col gap-1.5 p-3.5'>
            <p className='text-ink-faint flex flex-wrap items-center gap-x-1.5 text-xs'>
               {item.date && <span>{formatDate(item.date)}</span>}
               <span aria-hidden>·</span>
               <span>
                  {linked && item.outlet
                     ? `${t(CATEGORY_LABELS[item.category])} · ${item.outlet}`
                     : t(CATEGORY_LABELS[item.category])}
               </span>
            </p>
            <button
               type='button'
               className='text-ink-strong line-clamp-2 text-left leading-snug font-semibold hover:underline'
               data-hint={t('Открыть новость')}
               onClick={onOpen}
            >
               {firstOf(item.title) || t('Без заголовка')}
            </button>
            {firstOf(item.excerpt) && (
               <p className='text-ink-soft text-meta line-clamp-3'>
                  {firstOf(item.excerpt)}
               </p>
            )}
            {item.collected && item.note && (
               <p
                  className='text-ink-faint line-clamp-1 text-xs'
                  title={item.note}
               >
                  {item.note}
               </p>
            )}
         </div>
         <CardActions
            item={item}
            publishing={publishing}
            readOnly={readOnly}
            rejecting={rejecting}
            onDelete={onDelete}
            onOpen={onOpen}
            onPublish={onPublish}
            onReject={onReject}
         />
      </article>
   );
};

/* A found news item in Настройки → Сбор новостей: a small card, its picture
   beside the text, and the one action its state needs: «Опубликовать» or
   «Отклонить» while it waits, «Снять с сайта» once on the site, «Вернуть» once
   rejected. The full card above stays for Сайт → Новости. */
export const FoundCard = ({
   item,
   onOpen,
   onDelete,
   onPublish,
   publishing,
   onReject,
   rejecting,
   readOnly = false,
}: ItemProps) => {
   const { t } = useTranslation('site');
   const Icon = COVER_ICONS[item.category];
   const linked = LINKED_CATEGORIES.includes(item.category);
   const title = firstOf(item.title) || t('Без заголовка');
   return (
      <article className='border-line flex flex-col rounded-xl border bg-white'>
         <div className='flex gap-3 p-3.5'>
            <button
               type='button'
               className='bg-accent-tint h-20 w-28 shrink-0 overflow-hidden rounded-lg'
               data-hint={t('Открыть новость')}
               onClick={onOpen}
            >
               {item.image ? (
                  <img
                     alt=''
                     className='size-full object-cover'
                     loading='lazy'
                     src={item.image}
                  />
               ) : (
                  <span className='text-accent grid size-full place-items-center'>
                     <Icon aria-hidden className='size-7 opacity-80' />
                  </span>
               )}
            </button>
            <div className='flex min-w-0 flex-1 flex-col gap-1'>
               <p className='text-ink-faint flex flex-wrap items-center gap-x-1.5 text-xs'>
                  <span>{t(CATEGORY_LABELS[item.category])}</span>
                  {linked && item.outlet && (
                     <>
                        <span aria-hidden>·</span>
                        <span>{item.outlet}</span>
                     </>
                  )}
                  {item.date && (
                     <>
                        <span aria-hidden>·</span>
                        <span>{formatDate(item.date)}</span>
                     </>
                  )}
               </p>
               <button
                  type='button'
                  className='text-ink-strong text-meta line-clamp-2 text-left leading-snug font-semibold hover:underline'
                  data-hint={t('Открыть новость')}
                  onClick={onOpen}
               >
                  {title}
               </button>
               {item.note && (
                  <p
                     className='text-ink-faint line-clamp-1 text-xs'
                     title={item.note}
                  >
                     {item.note}
                  </p>
               )}
            </div>
         </div>
         <CardActions
            item={item}
            publishing={publishing}
            readOnly={readOnly}
            rejecting={rejecting}
            onDelete={onDelete}
            onOpen={onOpen}
            onPublish={onPublish}
            onReject={onReject}
         />
      </article>
   );
};
