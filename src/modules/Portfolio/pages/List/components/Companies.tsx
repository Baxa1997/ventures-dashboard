import {
   INSTRUMENT_LABELS,
   PORTFOLIO_PATH,
} from '@modules/Portfolio/constants';
import {
   formatK,
   hasAllDocs,
   isOverdue,
   nowOf,
   quarterName,
} from '@modules/Portfolio/helpers';
import type { PortfolioData } from '@modules/Portfolio/hooks';
import {
   Badge,
   Card,
   Person,
   StatTile,
   Table,
   TD,
   TH,
} from '@shared/components';
import { formatDate, formatUsd } from '@shared/helpers';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';

interface CompaniesProps {
   data: PortfolioData;
}

// The four headline figures and the companies, each with what is going on.
const Companies = ({ data }: CompaniesProps) => {
   const { t, i18n } = useTranslation('portfolio');
   const navigate = useNavigate();
   const language = i18n.resolvedLanguage ?? i18n.language;
   const { companies, requests, cycle } = data;
   const invested = companies.reduce(
      (sum, { invested: value }) => sum + value,
      0,
   );
   const reported = companies.filter((company) =>
      hasAllDocs(company, cycle.quarter),
   );
   const piloted = companies.filter(({ pilots }) =>
      pilots.some(({ status }) => status === 'success'),
   );
   const completedPilots = piloted.reduce(
      (sum, { pilots }) =>
         sum + pilots.filter(({ status }) => status === 'success').length,
      0,
   );
   const open = requests.filter(({ status }) => status !== 'closed');
   const overdue = open.filter(isOverdue);

   return (
      <>
         <div className='gap-section stagger grid sm:grid-cols-2 xl:grid-cols-4'>
            <StatTile
               label={t('Вложено напрямую')}
               note={t('{{count}} компания', { count: companies.length })}
               value={formatUsd(invested, language)}
            />
            <StatTile
               label={t('Отчёты за {{quarter}}', {
                  quarter: quarterName(t, cycle.quarter),
               })}
               note={
                  cycle.remindedAt
                     ? t('срок {{due}} · напоминание {{date}}', {
                          due: formatDate(cycle.due),
                          date: formatDate(cycle.remindedAt),
                       })
                     : t('срок сдачи {{date}}', { date: formatDate(cycle.due) })
               }
               tone={reported.length < companies.length ? 'warning' : 'success'}
               value={t('{{done}} из {{total}}', {
                  done: reported.length,
                  total: companies.length,
               })}
            />
            <StatTile
               label={t('Пилоты с бизнес-линиями SQB')}
               note={piloted
                  .map((company) =>
                     company.commercial
                        ? t('{{name}} · договор на согласовании', {
                             name: company.name,
                          })
                        : company.name,
                  )
                  .join(' · ')}
               tone='success'
               value={t('{{count}} завершён', { count: completedPilots })}
            />
            <StatTile
               label={t('Запросы компаний к фонду')}
               note={
                  overdue.length
                     ? t('{{count}} ждёт ответа фонда больше 5 дней', {
                          count: overdue.length,
                       })
                     : t('ответы в срок')
               }
               tone={overdue.length ? 'danger' : 'ink'}
               value={t('{{count}} открытый', { count: open.length })}
            />
         </div>

         <Card className='mt-section flex-1'>
            <Table
               className='min-w-4xl'
               head={
                  <>
                     <th className={TH}>{t('Компания')}</th>
                     <th className={TH}>{t('Инструмент')}</th>
                     <th className={clsx(TH, 'text-right')}>{t('Вложено')}</th>
                     <th className={TH}>{t('В портфеле')}</th>
                     <th className={TH}>
                        {t('Отчёт {{quarter}}', {
                           quarter: `Q${cycle.quarter.slice(-1)}`,
                        })}
                     </th>
                     <th className={TH}>{t('Ответственный')}</th>
                     <th className={TH}>{t('Что происходит')}</th>
                  </>
               }
            >
               {companies.map((company) => {
                  const now = nowOf(t, company, requests, cycle);
                  const received = hasAllDocs(company, cycle.quarter);
                  return (
                     <tr
                        key={company.id}
                        className='hover:bg-ground/60 cursor-pointer'
                        onClick={() =>
                           navigate(`${PORTFOLIO_PATH}/${company.id}`)
                        }
                     >
                        <td className={TD}>
                           <Link
                              className='text-sm font-semibold hover:underline'
                              to={`${PORTFOLIO_PATH}/${company.id}`}
                              onClick={(event) => event.stopPropagation()}
                           >
                              {company.name}
                           </Link>
                           <div className='text-ink-soft mt-0.5 text-xs'>
                              {company.tagline || '—'}
                           </div>
                        </td>
                        <td className={clsx(TD, 'text-ink-soft')}>
                           {t(INSTRUMENT_LABELS[company.instrument])}
                        </td>
                        <td
                           className={clsx(
                              TD,
                              'text-right font-medium tabular-nums',
                           )}
                        >
                           {formatK(company.invested)}
                        </td>
                        <td
                           className={clsx(
                              TD,
                              'text-ink-soft whitespace-nowrap',
                           )}
                        >
                           {t('с {{year}}', { year: company.since })}
                        </td>
                        <td className={TD}>
                           <Badge tone={received ? 'success' : 'accent'}>
                              {received ? t('Получен') : t('Ожидается')}
                           </Badge>
                        </td>
                        <td className={TD}>
                           <Person id={company.ownerId} />
                        </td>
                        <td
                           className={clsx(
                              TD,
                              'w-[30%] text-xs',
                              now.late && 'text-danger',
                           )}
                        >
                           {now.text}
                        </td>
                     </tr>
                  );
               })}
            </Table>
         </Card>
         <p className='text-ink-soft mt-section text-xs'>
            {t('Карточка компании открывается по клику на строку.')}
         </p>
      </>
   );
};

export default Companies;
