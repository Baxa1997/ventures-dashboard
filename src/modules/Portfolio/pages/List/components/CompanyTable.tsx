import { listName } from '@modules/Settings/services';
import {
   COMPANY_STATUSES,
   INSTRUMENT_LABELS,
   PORTFOLIO_PATH,
} from '@modules/Portfolio/constants';
import {
   formatMoic,
   formatStake,
   latestValue,
   nowOf,
   positionOf,
   quarterLabel,
} from '@modules/Portfolio/helpers';
import type { PortfolioData } from '@modules/Portfolio/hooks';
import {
   Badge,
   Card,
   CompanyMark,
   NoData,
   Table,
   TD,
   TH,
} from '@shared/components';
import { formatDayYear, formatUsd } from '@shared/helpers';
import type { PortfolioCompany } from '@shared/types/portfolio.types';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

interface CompanyTableProps {
   data: PortfolioData;
   companies: PortfolioCompany[]; // those the search leaves
   onValuation: (company: PortfolioCompany) => void;
}

const NUM = 'text-right whitespace-nowrap tabular-nums';

/* «Таблица», as the design draws it: each company with its status, the
   investment, the fund's stake, the company's valuation (pressed to update
   it), what the stake is worth, MOIC, the latest MRR and the pilots under
   way. Under the name, a request the fund has left unanswered too long, or
   else how many wait for its answer (on the card's «Обзор»). A row opens
   the company's card. */
const CompanyTable = ({ data, companies, onValuation }: CompanyTableProps) => {
   const { t, i18n } = useTranslation('portfolio');
   const navigate = useNavigate();
   const language = i18n.resolvedLanguage ?? i18n.language;
   const usd = (value: number | null) =>
      value === null ? '—' : formatUsd(value, language);

   return (
      <Card className='mb-section'>
         {companies.length ? (
            <Table
               className='min-w-5xl'
               head={
                  <>
                     <th className={TH}>{t('Компания')}</th>
                     <th className={TH}>{t('Статус')}</th>
                     <th className={TH}>{t('Инвестиция')}</th>
                     <th className={clsx(TH, 'text-right')}>{t('Вложено')}</th>
                     <th className={clsx(TH, 'text-right')}>
                        {t('Доля фонда')}
                     </th>
                     <th className={clsx(TH, 'text-right')}>
                        {t('Оценка компании')}
                     </th>
                     <th className={clsx(TH, 'text-right')}>
                        {t('Стоимость доли')}
                     </th>
                     <th className={clsx(TH, 'text-right')}>{t('MOIC')}</th>
                     <th className={clsx(TH, 'text-right')}>{t('MRR')}</th>
                     <th className={clsx(TH, 'text-right')}>{t('Пилоты')}</th>
                  </>
               }
            >
               {companies.map((company) => {
                  const position = positionOf(company);
                  const status = COMPANY_STATUSES[company.status];
                  const now = nowOf(t, company, data.requests, data.cycle);
                  const mrr = latestValue(company, 'mrr');
                  const asking = data.requests.filter(
                     ({ companyId, status }) =>
                        companyId === company.id && status !== 'closed',
                  ).length;
                  const first = company.investments[0];
                  const pilots = company.pilots.filter(
                     ({ status: state }) => state === 'in_progress',
                  ).length;
                  return (
                     <tr
                        key={company.id}
                        className='hover:bg-hover cursor-pointer'
                        onClick={() =>
                           navigate(`${PORTFOLIO_PATH}/${company.id}`)
                        }
                     >
                        <td className={TD}>
                           <div className='flex items-center gap-2.5'>
                              <CompanyMark name={company.name} />
                              <div className='min-w-0'>
                                 <div className='font-semibold'>
                                    {company.name}
                                 </div>
                                 <div className='text-ink-soft text-xs'>
                                    {listName(
                                       'industries',
                                       company.industryKey,
                                    ) ||
                                       company.tagline ||
                                       '—'}
                                 </div>
                                 {now.late ? (
                                    <div className='text-danger text-xs'>
                                       {now.text}
                                    </div>
                                 ) : (
                                    asking > 0 && (
                                       <div className='text-accent text-xs'>
                                          {t('Ждёт ответа фонда: {{count}}', {
                                             count: asking,
                                          })}
                                       </div>
                                    )
                                 )}
                              </div>
                           </div>
                        </td>
                        <td className={TD}>
                           <Badge tone={status.tone}>{t(status.label)}</Badge>
                        </td>
                        <td className={clsx(TD, 'whitespace-nowrap')}>
                           {t(INSTRUMENT_LABELS[company.instrument])}
                           <div className='text-ink-soft text-xs'>
                              {first
                                 ? formatDayYear(first.date)
                                 : t('с {{year}}', { year: company.since })}
                           </div>
                        </td>
                        <td className={clsx(TD, NUM)}>
                           {formatUsd(company.invested, language)}
                        </td>
                        <td className={clsx(TD, NUM)}>
                           {position.stake === null
                              ? '—'
                              : formatStake(position.stake, language)}
                        </td>
                        <td className={clsx(TD, NUM)}>
                           {company.status === 'active' ? (
                              <button
                                 type='button'
                                 className='link'
                                 title={t('Обновить оценку')}
                                 onClick={(event) => {
                                    event.stopPropagation();
                                    onValuation(company);
                                 }}
                              >
                                 {position.valuation === null
                                    ? t('Внести')
                                    : usd(position.valuation)}
                              </button>
                           ) : (
                              <span className='text-ink-soft'>
                                 {company.exit?.date
                                    ? t('выход {{date}}', {
                                         date: formatDayYear(company.exit.date),
                                      })
                                    : '—'}
                              </span>
                           )}
                        </td>
                        <td className={clsx(TD, NUM)}>{usd(position.value)}</td>
                        <td className={clsx(TD, NUM)}>
                           {position.moic === null ? (
                              '—'
                           ) : (
                              <b
                                 className={
                                    position.moic >= 1
                                       ? 'text-success'
                                       : 'text-danger'
                                 }
                              >
                                 {formatMoic(position.moic, language)}
                              </b>
                           )}
                        </td>
                        <td className={clsx(TD, NUM)}>
                           {mrr ? (
                              <>
                                 {formatUsd(mrr.value, language)}{' '}
                                 <span className='text-ink-faint text-xs'>
                                    {quarterLabel(t, mrr.quarter)}
                                 </span>
                              </>
                           ) : (
                              '—'
                           )}
                        </td>
                        <td className={clsx(TD, NUM)}>{pilots || '—'}</td>
                     </tr>
                  );
               })}
            </Table>
         ) : (
            <NoData>{t('Ничего не найдено')}</NoData>
         )}
         <footer className='border-line text-ink-soft border-t px-4.5 py-2.5 text-xs'>
            {t(
               'Нажмите на строку, чтобы открыть карточку компании, или на оценку, чтобы обновить её. Компания попадает в портфель из своей сделки при закрытии.',
            )}
         </footer>
      </Card>
   );
};

export default CompanyTable;
