import useDeals from '@modules/Deals/hooks/useDeals';
import { STATUS_LABELS } from '@modules/Deals/constants';
import {
   Badge,
   type BadgeTone,
   Button,
   buttonClass,
   Card,
   ConfirmDialog,
   NoData,
   Table,
   TD,
   TH,
} from '@shared/components';
import { CHAT_PATH } from '@shared/constants';
import { useAction, useCurrentUser } from '@shared/hooks';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import telegram, { type TgGroup, useTelegram } from '../services/telegram';

const GROUP_STATES = {
   none: { label: 'Нет группы', tone: 'neutral' },
   requested: { label: 'Открывается', tone: 'info' },
   creating: { label: 'Открывается', tone: 'info' },
   waiting_bot: { label: 'Ждёт подключения', tone: 'warning' },
   active: { label: 'Открыта', tone: 'success' },
   lost: { label: 'Бот убран', tone: 'danger' },
   failed: { label: 'Не открылась', tone: 'danger' },
} as const satisfies Record<
   TgGroup['status'] | 'none',
   { label: string; tone: BadgeTone }
>;

interface DealGroupsProps {
   canEdit: boolean;
}

/* «Группы сделок»: every deal the person sees with where its Telegram group
   stands, and the step for it — open one for a deal made before Telegram was
   connected, link it by hand without the fund's account, open it in
   Telegram, or link it again. Deals without a group can be given one all at
   once. */
const DealGroups = ({ canEdit }: DealGroupsProps) => {
   const { t } = useTranslation('chat');
   const { t: tDeals } = useTranslation('deals');
   const user = useCurrentUser();
   const { deals } = useDeals();
   const state = useTelegram();
   const [query, setQuery] = useState('');
   const [bulkOpen, setBulkOpen] = useState(false);
   const ask = useAction(
      (list: { dealId: string; title: string }[]) =>
         telegram.requestGroups(list, user.id),
      { kind: 'create', success: t('Группы запрошены'), error: t('Не удалось запросить группы') },
   );
   if (!state) return null;

   const titleOf = (company: string) => t('Сделка: {{company}}', { company });
   const needle = query.trim().toLowerCase();
   const rows = deals
      .filter(
         (deal) =>
            !needle ||
            `${deal.company} ${deal.number}`.toLowerCase().includes(needle),
      )
      .map((deal) => ({ deal, group: state.groups.get(deal.id) ?? null }));
   // open deals without a working group: what «Открыть группы» covers
   const missing = deals.filter((deal) => {
      const group = state.groups.get(deal.id);
      return (
         ['review', 'active', 'paused', 'portfolio'].includes(deal.status) &&
         (!group || group.status === 'lost' || group.status === 'failed')
      );
   });
   const off = !state.connected
      ? t('Сначала нужен работающий сервер бота')
      : !canEdit
        ? t('Группы открывает директор')
        : '';

   return (
      <Card
         action={
            <Button
               disabled={!!off || !missing.length}
               hint={
                  off ||
                  (missing.length
                     ? t('Открыть группы для всех сделок в работе и в портфеле, у которых их нет')
                     : t('У всех сделок в работе уже есть группа'))
               }
               size='sm'
               onClick={() => setBulkOpen(true)}
            >
               {t('Открыть группы ({{n}})', { n: missing.length })}
            </Button>
         }
         hint={t('{{count}} сделок', { count: deals.length })}
         title={t('Группы сделок')}
      >
         <div className='border-line border-b px-4.5 py-2.5'>
            <div className='relative max-w-80'>
               <Search
                  aria-hidden
                  className='text-ink-soft pointer-events-none absolute top-2.5 left-3 size-4'
               />
               <input
                  aria-label={t('Найти сделку')}
                  className='field-input text-meta h-9 w-full pl-9'
                  placeholder={t('Найти сделку')}
                  type='search'
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
               />
            </div>
         </div>
         {rows.length ? (
            <div className='max-h-[26rem] overflow-y-auto'>
               <Table
                  className='min-w-[40rem]'
                  head={
                     <>
                        <th className={TH}>{t('Сделка')}</th>
                        <th className={TH}>{t('Статус сделки')}</th>
                        <th className={TH}>{t('Группа в Telegram')}</th>
                        <th className={TH} />
                     </>
                  }
               >
                  {rows.map(({ deal, group }) => {
                     const where = GROUP_STATES[group?.status ?? 'none'];
                     const link = group ? telegram.linkOf(state, group) : '';
                     return (
                        <tr key={deal.id}>
                           <td className={TD}>
                              <Link
                                 className='font-semibold hover:underline'
                                 data-hint={t('Открыть группу «{{name}}» в «Чат и письма»', {
                                    name: titleOf(deal.company),
                                 })}
                                 to={`${CHAT_PATH}?chat=${deal.id}`}
                              >
                                 {deal.company}
                              </Link>
                              <div className='text-ink-faint text-xs'>{deal.number}</div>
                           </td>
                           <td className={`${TD} text-ink-soft`}>
                              {tDeals(STATUS_LABELS[deal.status])}
                           </td>
                           <td className={TD}>
                              <Badge tone={where.tone}>{t(where.label)}</Badge>
                           </td>
                           <td className={`${TD} text-right whitespace-nowrap`}>
                              {group?.status === 'active' && group.inviteLink ? (
                                 <a
                                    className={buttonClass('ghost', undefined, false, 'sm')}
                                    data-hint={t('Открыть группу «{{name}}» в Telegram', {
                                       name: titleOf(deal.company),
                                    })}
                                    href={group.inviteLink}
                                    rel='noreferrer'
                                    target='_blank'
                                 >
                                    {t('Открыть в Telegram')}
                                 </a>
                              ) : group?.status === 'waiting_bot' && link ? (
                                 <a
                                    className={buttonClass('primary', undefined, false, 'sm')}
                                    data-hint={t(
                                       'Создайте в Telegram пустую группу, откройте эту ссылку (лучше на телефоне) и выберите группу: бот станет её админом',
                                    )}
                                    href={link}
                                    rel='noreferrer'
                                    target='_blank'
                                 >
                                    {t('Подключить группу')}
                                 </a>
                              ) : group?.status === 'requested' || group?.status === 'creating' ? (
                                 <span className='text-ink-faint text-xs'>{t('Открывается…')}</span>
                              ) : (
                                 <Button
                                    disabled={!!off}
                                    hint={
                                       off ||
                                       (state.mode === 'account'
                                          ? t('Аккаунт фонда создаст группу «{{name}}»', {
                                               name: titleOf(deal.company),
                                            })
                                          : t('Появится ссылка «Подключить группу» для этой сделки'))
                                    }
                                    loading={ask.pending}
                                    size='sm'
                                    variant='ghost'
                                    onClick={() =>
                                       void ask.run([
                                          { dealId: deal.id, title: titleOf(deal.company) },
                                       ])
                                    }
                                 >
                                    {group ? t('Подключить заново') : t('Открыть группу')}
                                 </Button>
                              )}
                           </td>
                        </tr>
                     );
                  })}
               </Table>
            </div>
         ) : (
            <div className='p-4.5'>
               <NoData>{needle ? t('Ничего не найдено') : t('Сделок пока нет')}</NoData>
            </div>
         )}
         <ConfirmDialog
            confirmLabel={t('Открыть группы')}
            open={bulkOpen}
            success={t('Группы запрошены')}
            title={t('Открыть группы для {{count}} сделок?', { count: missing.length })}
            onClose={() => setBulkOpen(false)}
            onConfirm={() =>
               telegram.requestGroups(
                  missing.map((deal) => ({ dealId: deal.id, title: titleOf(deal.company) })),
                  user.id,
               )
            }
         >
            <p>
               {state.mode === 'account'
                  ? t(
                       'Аккаунт фонда создаст их по одной, примерно раз в 15 секунд, чтобы Telegram не счёл это спамом. Каждая группа займёт место из 500, которые есть у аккаунта.',
                    )
                  : t(
                       'Аккаунт фонда не подключён: у каждой сделки появится ссылка «Подключить группу», и группу к ней подключают вручную.',
                    )}
            </p>
         </ConfirmDialog>
      </Card>
   );
};

export default DealGroups;
