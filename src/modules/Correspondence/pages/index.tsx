import { CONTRACTS_PATH } from '@modules/Contracts/constants';
import LetterDialog from '@modules/Correspondence/components/LetterDialog';
import NewLetterDialog from '@modules/Correspondence/components/NewLetterDialog';
import {
   type LettersTab,
   SEND_STATUSES,
   STATUSES,
   TAB_LABELS,
   TABS,
} from '@modules/Correspondence/constants';
import { letterDate, letterNumber } from '@modules/Correspondence/helpers';
import correspondence, {
   type CorrespondenceState,
   FUND_TURN,
} from '@modules/Correspondence/services';
import {
   Badge,
   Button,
   Card,
   FilterBar,
   FilterSelect,
   Loading,
   NoData,
   PageBody,
   PageHeader,
   SearchField,
   STACK,
   Table,
   Tabs,
   TD,
   TH,
} from '@shared/components';
import { capitalize, formatDate, personName } from '@shared/helpers';
import { useServiceData } from '@shared/hooks';
import type {
   Letter,
   LetterDirection,
} from '@shared/types/correspondence.types';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';

const ALL = 'all';

const toTab = (value: string | null): LettersTab =>
   TABS.find((tab) => tab === value) ?? 'all';

const load = () => correspondence.getState();
const subscribe = (listener: () => void) => correspondence.subscribe(listener);

/* Корреспонденция: letters with numbers and answer dates, the monthly
   reports under ПП-59 and the control plan behind them. Every letter is tied
   to a deal, a contract or the regulation. The address keeps the tab. */
const CorrespondencePage = () => {
   const { t } = useTranslation('correspondence');
   const { t: tLayout } = useTranslation('layout');
   const data = useServiceData(load, subscribe);
   const [params, setParams] = useSearchParams();
   const tab = toTab(params.get('tab'));
   const [search, setSearch] = useState('');
   const [direction, setDirection] = useState<LetterDirection | typeof ALL>(
      ALL,
   );
   const [party, setParty] = useState(ALL);
   const [creating, setCreating] = useState<LetterDirection | null>(null);
   const [openId, setOpenId] = useState<string | null>(null);
   const title = t('Корреспонденция');

   if (!data)
      return (
         <>
            <PageHeader section={tLayout('Фонд')} title={title} />
            <Loading />
         </>
      );

   const counts: Record<LettersTab, number> = {
      all: data.letters.length,
      fund: data.letters.filter(({ status }) => FUND_TURN.includes(status))
         .length,
      regular: data.sends.filter(({ status }) => status === 'in_work').length,
   };
   const parties = [...new Set(data.letters.map((letter) => letter.party))];
   const query = search.trim().toLowerCase();
   const rows = data.letters.filter(
      (letter) =>
         (tab !== 'fund' || FUND_TURN.includes(letter.status)) &&
         (direction === ALL || letter.direction === direction) &&
         (party === ALL || letter.party === party) &&
         (!query ||
            `${letter.number ?? ''} ${letter.party} ${letter.subject}`
               .toLowerCase()
               .includes(query)),
   );

   return (
      <>
         <PageHeader
            actions={
               <>
                  <Button variant='ghost' onClick={() => setCreating('in')}>
                     {t('Зарегистрировать входящее')}
                  </Button>
                  <Button onClick={() => setCreating('out')}>
                     {t('Новое исходящее')}
                  </Button>
               </>
            }
            meta={[
               t('Входящие и исходящие письма с номерами'),
               t('отправки по регламенту ПП-59'),
               t('каждое письмо привязано к сделке, компании или договору'),
            ].join(' · ')}
            section={tLayout('Фонд')}
            title={title}
         >
            <Tabs
               active={tab}
               items={TABS.map((id) => ({
                  id,
                  label: t(TAB_LABELS[id]),
                  count: counts[id],
               }))}
               label={title}
               onChange={(next) =>
                  setParams(next === 'all' ? {} : { tab: next }, {
                     replace: true,
                  })
               }
            />
         </PageHeader>
         <PageBody className='gap-section grid flex-1 xl:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)]'>
            <div className='flex min-w-0 flex-col self-stretch'>
               {tab === 'regular' ? (
                  <Sends data={data} />
               ) : (
                  <>
                     <FilterBar>
                        <SearchField
                           label={t('Номер, контрагент, тема')}
                           value={search}
                           onChange={setSearch}
                        />
                        <FilterSelect
                           label={t('Направление')}
                           options={[
                              { value: ALL, label: t('Вх. и исх.') },
                              { value: 'in', label: t('Входящие') },
                              { value: 'out', label: t('Исходящие') },
                           ]}
                           showLabel={false}
                           value={direction}
                           onChange={setDirection}
                        />
                        <FilterSelect
                           label={t('Контрагент')}
                           options={[
                              { value: ALL, label: t('Все контрагенты') },
                              ...parties.map((value) => ({
                                 value,
                                 label: value,
                              })),
                           ]}
                           showLabel={false}
                           value={party}
                           onChange={setParty}
                        />
                     </FilterBar>
                     <Card className='mt-section flex flex-1 flex-col'>
                        {rows.length ? (
                           <Table
                              className='min-w-2xl'
                              head={
                                 <>
                                    <th className={TH}>{t('№ и дата')}</th>
                                    <th className={TH}>{t('Письмо')}</th>
                                    <th className={TH}>{t('Связано с')}</th>
                                    <th className={TH}>{t('Статус')}</th>
                                 </>
                              }
                           >
                              {rows.map((letter) => (
                                 <tr
                                    key={letter.id}
                                    className='hover:bg-ground/60 cursor-pointer'
                                    onClick={() => setOpenId(letter.id)}
                                 >
                                    <td className={clsx(TD, 'w-36')}>
                                       <button
                                          type='button'
                                          className='text-left text-sm font-semibold'
                                       >
                                          {letterNumber(t, letter)}
                                       </button>
                                       <div className='text-ink-soft mt-0.5 text-xs'>
                                          {letterDate(t, letter)}
                                       </div>
                                    </td>
                                    <td className={TD}>
                                       <div className='text-ink-soft text-xs'>
                                          {letter.party}
                                       </div>
                                       <div className='mt-0.5'>
                                          {letter.subject}
                                       </div>
                                    </td>
                                    <td
                                       className={clsx(TD, 'whitespace-nowrap')}
                                    >
                                       <LinkTo letter={letter} />
                                    </td>
                                    <td className={TD}>
                                       <Badge
                                          tone={STATUSES[letter.status].tone}
                                       >
                                          {t(STATUSES[letter.status].label)}
                                       </Badge>
                                    </td>
                                 </tr>
                              ))}
                           </Table>
                        ) : (
                           <NoData>{t('Писем по этим условиям нет')}</NoData>
                        )}
                     </Card>
                  </>
               )}
               <p className='text-ink-soft mt-section text-xs'>
                  {t(
                     'Из базы «Письма» и «Отправки по регламенту» в Notion. Номер, срок ответа и ответственный обязательны: без них письмо нельзя закрыть.',
                  )}
               </p>
            </div>
            <div className={STACK}>
               <SendsCard data={data} />
               <Card title={t('План контроля № 37 по ПП-59')}>
                  <ul className='divide-line divide-y px-5'>
                     {data.control.map((item) => (
                        <li key={item.point} className='py-3.5'>
                           <div className='text-ink-soft text-xs'>
                              {t('Пункт {{point}}', { point: item.point })}
                           </div>
                           <div className='mt-1'>{item.text}</div>
                           <div className='mt-2'>
                              <Badge
                                 tone={
                                    item.status === 'done'
                                       ? 'success'
                                       : 'accent'
                                 }
                              >
                                 {item.status === 'done'
                                    ? t('Выполнено')
                                    : t('В работе')}
                              </Badge>
                           </div>
                        </li>
                     ))}
                  </ul>
               </Card>
            </div>
         </PageBody>
         <NewLetterDialog
            direction={creating}
            onClose={() => setCreating(null)}
         />
         <LetterDialog
            letter={data.letters.find(({ id }) => id === openId) ?? null}
            onClose={() => setOpenId(null)}
         />
      </>
   );
};

// Where a letter belongs: the deal, the contract, the regulation, the letter
// it answers.
const LinkTo = ({ letter }: { letter: Letter }) => {
   const { link } = letter;
   const to =
      link.kind === 'deal' && link.id
         ? `/deals/${link.id}`
         : link.kind === 'contract' && link.id
           ? `${CONTRACTS_PATH}/${link.id}`
           : link.kind === 'regulation'
             ? '?tab=regular'
             : null;
   if (!to) return <span className='text-accent text-meta'>{link.label}</span>;
   return (
      <Link
         className='link'
         to={to}
         onClick={(event) => event.stopPropagation()}
      >
         {link.label}
      </Link>
   );
};

const sendTitle = (month: string) =>
   capitalize(dayjs(`${month}-01`).format('MMMM YYYY'));

const SendsCard = ({ data }: { data: CorrespondenceState }) => {
   const { t } = useTranslation('correspondence');
   return (
      <Card hint={t('ежемесячно')} title={t('Регламентные отправки')}>
         <ul className='divide-line divide-y px-5'>
            {data.sends.map((send) => (
               <li
                  key={send.month}
                  className='flex items-start justify-between gap-3 py-3'
               >
                  <div>
                     <div className='font-semibold'>
                        {sendTitle(send.month)}
                     </div>
                     {(send.status === 'in_work' || send.letter) && (
                        <div className='text-ink-soft mt-0.5 text-xs'>
                           {send.status === 'in_work'
                              ? t('срок {{date}} · готовит {{name}}', {
                                   date: formatDate(send.due),
                                   name: personName(send.ownerId),
                                })
                              : t('исх. {{letter}} · готовил {{name}}', {
                                   letter: send.letter,
                                   name: personName(send.ownerId),
                                })}
                        </div>
                     )}
                  </div>
                  <Badge tone={SEND_STATUSES[send.status].tone}>
                     {t(SEND_STATUSES[send.status].label)}
                  </Badge>
               </li>
            ))}
         </ul>
      </Card>
   );
};

// The regulation's monthly reports as a table, on their own tab.
const Sends = ({ data }: { data: CorrespondenceState }) => {
   const { t } = useTranslation('correspondence');
   return (
      <Card className='flex-1'>
         <Table
            head={
               <>
                  <th className={TH}>{t('Месяц')}</th>
                  <th className={TH}>{t('Срок')}</th>
                  <th className={TH}>{t('Готовит')}</th>
                  <th className={TH}>{t('Исходящее')}</th>
                  <th className={TH}>{t('Статус')}</th>
               </>
            }
         >
            {data.sends.map((send) => (
               <tr key={send.month}>
                  <td className={clsx(TD, 'font-semibold')}>
                     {sendTitle(send.month)}
                  </td>
                  <td className={clsx(TD, 'text-ink-soft')}>
                     {formatDate(send.due)}
                  </td>
                  <td className={TD}>{personName(send.ownerId)}</td>
                  <td className={clsx(TD, 'text-ink-soft')}>
                     {send.letter
                        ? t('исх. {{letter}}', { letter: send.letter })
                        : '—'}
                  </td>
                  <td className={TD}>
                     <Badge tone={SEND_STATUSES[send.status].tone}>
                        {t(SEND_STATUSES[send.status].label)}
                     </Badge>
                  </td>
               </tr>
            ))}
         </Table>
      </Card>
   );
};

export default CorrespondencePage;
