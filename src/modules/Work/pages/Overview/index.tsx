import { stageNorm } from '@modules/Deals/helpers';
import { DEAL_STAGE_LABELS } from '@modules/Work/constants';
import { formatToday } from '@modules/Work/helpers';
import { useTasks } from '@modules/Work/hooks';
import {
   Button,
   buttonClass,
   Card,
   Loading,
   NoData,
   PageBody,
   PageHeader,
} from '@shared/components';
import { MY_DAY_PATH, SECTION_PATHS } from '@shared/constants';
import { useCurrentUser } from '@shared/hooks';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import {
   BarList,
   Deadlines,
   Decisions,
   FundMoney,
   Portfolio,
} from './components';
import { DECISIONS_LIMIT, QUARTERS } from './constants';
import { formatRange, formatUsd } from './helpers';
import { useOverview } from './hooks';

const Overview = () => {
   const { t, i18n } = useTranslation('work');
   const { t: tLayout } = useTranslation('layout');
   const user = useCurrentUser();
   const { employees } = useTasks();
   const { fund, decisions, week, deadlines } = useOverview(user.id);
   const language = i18n.resolvedLanguage ?? i18n.language;

   return (
      <>
         <PageHeader
            section={tLayout('Работа')}
            title={t('Обзор фонда')}
            meta={
               fund &&
               `${formatToday(true)} · ${t('данные обновлены в {{time}}', {
                  time: fund.updatedAt,
               })}`
            }
            actions={
               <>
                  <Button variant='ghost' onClick={() => window.print()}>
                     {t('Выгрузить для НС')}
                  </Button>
                  <Link
                     className={buttonClass()}
                     to={`${SECTION_PATHS.deals}?new=1`}
                  >
                     {t('Новая сделка')}
                  </Link>
               </>
            }
         />
         {!fund ? (
            <Loading />
         ) : (
            <PageBody className='gap-section flex flex-col'>
               <div className='gap-section grid xl:grid-cols-[minmax(0,1fr)_23.75rem]'>
                  <Card
                     className='flex flex-col'
                     title={t('Требуют вашего решения')}
                     hint={decisions.length}
                     action={
                        <Link className='link' to={MY_DAY_PATH}>
                           {t('Все решения')}
                        </Link>
                     }
                  >
                     {decisions.length ? (
                        <Decisions
                           employees={employees}
                           items={decisions.slice(0, DECISIONS_LIMIT)}
                        />
                     ) : (
                        <NoData>{t('Решений, которые ждут вас, нет')}</NoData>
                     )}
                  </Card>
                  <Card
                     className='flex flex-col'
                     title={t('Сроки на неделю')}
                     hint={formatRange(week.start, week.end)}
                     action={
                        <Link className='link' to={SECTION_PATHS.tasks}>
                           {t('Календарь')}
                        </Link>
                     }
                  >
                     {deadlines.length ? (
                        <Deadlines items={deadlines} />
                     ) : (
                        <NoData>{t('На этой неделе сроков нет')}</NoData>
                     )}
                  </Card>
               </div>

               <Card
                  title={t('Деньги фонда')}
                  hint={t('на счетах {{amount}} · капитал {{capital}}', {
                     amount: formatUsd(fund.money.onAccounts, language),
                     capital: formatUsd(fund.money.capital, language),
                  })}
                  action={
                     <Link className='link' to={SECTION_PATHS.finance}>
                        {t('Финансы фонда')}
                     </Link>
                  }
               >
                  <FundMoney money={fund.money} />
               </Card>

               <div className='gap-section grid xl:grid-cols-2'>
                  <Card
                     className='flex flex-col'
                     title={t('Воронка по стадиям')}
                     hint={t('{{count}} сделка', {
                        count: fund.funnel.reduce(
                           (sum, { count }) => sum + count,
                           0,
                        ),
                     })}
                     action={
                        <Link className='link' to={SECTION_PATHS.deals}>
                           {t('Открыть воронку')}
                        </Link>
                     }
                  >
                     <BarList
                        items={fund.funnel.map(({ stage, count, overdue }) => ({
                           id: stage,
                           label: t(DEAL_STAGE_LABELS[stage]),
                           value: count,
                           overdue,
                        }))}
                     />
                     <p className='text-ink-soft mt-auto px-5 pt-2 pb-4 text-xs'>
                        {t(
                           'Нормативы стадий: входящие — {{inbox}} рабочих дня, скрининг — {{screening}}, анализ — {{analysis}}, детальный DD — {{dd}}. Красным — сделки, где срок нарушен по вине фонда.',
                           {
                              inbox: stageNorm('inbox'),
                              screening: stageNorm('screening'),
                              analysis: stageNorm('analysis'),
                              dd: stageNorm('dd'),
                           },
                        )}
                     </p>
                  </Card>
                  <Card
                     title={t('Портфель')}
                     hint={`${t('{{count}} компания', {
                        count: fund.portfolio.companies.length,
                     })} · ${t('отчёты за {{quarter}} квартал', {
                        quarter: QUARTERS[fund.portfolio.quarter - 1],
                     })}`}
                     action={
                        <Link className='link' to={SECTION_PATHS.portfolio}>
                           {t('Открыть портфель')}
                        </Link>
                     }
                  >
                     <Portfolio portfolio={fund.portfolio} />
                  </Card>
               </div>

               <p className='text-ink-soft text-xs'>
                  {t(
                     'Суммы по отдельным компаниям и сделкам на макете примерные. Вложено $0,95 млн — из отчёта по ПП-59 за август 2026; остатки на счетах — из выписок, на макете примерные.',
                  )}
               </p>
            </PageBody>
         )}
      </>
   );
};

export default Overview;
