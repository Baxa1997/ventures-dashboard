import AttachDialog from '@modules/Finance/components/AttachDialog';
import NewPaymentDialog from '@modules/Finance/components/NewPaymentDialog';
import { type FinanceTab, TAB_LABELS, TABS } from '@modules/Finance/constants';
import {
   categoryAmount,
   formatMillions,
   groupTotal,
   unassignedCount,
} from '@modules/Finance/helpers';
import { useFinance } from '@modules/Finance/hooks';
import finance from '@modules/Finance/services';
import {
   Button,
   Loading,
   PageBody,
   PageHeader,
   Tabs,
} from '@shared/components';
import { downloadCsv, formatDate, formatUsd } from '@shared/helpers';
import { type ReactNode, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { Actuals, Budget, Capital, Payments } from './components';

const toTab = (value: string | null): FinanceTab =>
   TABS.find((tab) => tab === value) ?? 'capital';

/* Финансы фонда: capital and placement, budget and reporting, the actual
   figures from the bank statements, and payments for deals. The address
   keeps the tab (?tab=actuals). */
const FinancePage = () => {
   const { t, i18n } = useTranslation('finance');
   const { t: tLayout } = useTranslation('layout');
   const language = i18n.resolvedLanguage ?? i18n.language;
   const data = useFinance();
   const [params, setParams] = useSearchParams();
   const tab = toTab(params.get('tab'));
   const [paying, setPaying] = useState(false);
   const [attaching, setAttaching] = useState(false);
   const budgetInput = useRef<HTMLInputElement>(null);
   const statementInput = useRef<HTMLInputElement>(null);
   const title = t('Финансы фонда');

   if (!data)
      return (
         <>
            <PageHeader section={tLayout('Фонд')} title={title} />
            <Loading />
         </>
      );

   const select = (next: FinanceTab) =>
      setParams(next === 'capital' ? {} : { tab: next }, { replace: true });
   const statement = formatDate(data.statementDate);
   const waiting = unassignedCount(data);
   const counts: Record<FinanceTab, number | undefined> = {
      capital: undefined,
      budget: data.reports.filter(({ status }) =>
         ['draft', 'review', 'director', 'approved'].includes(status),
      ).length,
      actuals: waiting,
      payments: data.payments.filter(({ status }) => status !== 'paid').length,
   };

   const exportActuals = () =>
      downloadCsv('pnl.csv', [
         [
            t('Статья'),
            t('III квартал'),
            t('{{count}} месяц', { count: data.monthly.length }),
         ],
         ...data.categories.map((category) => [
            category.title,
            formatMillions(categoryAmount(data, category, true), language),
            formatMillions(categoryAmount(data, category, false), language),
         ]),
         [
            t('Операционный результат'),
            formatMillions(
               groupTotal(data, 'income', true) +
                  groupTotal(data, 'expense', true),
               language,
            ),
            formatMillions(
               groupTotal(data, 'income', false) +
                  groupTotal(data, 'expense', false),
               language,
            ),
         ],
      ]);

   const meta: Record<FinanceTab, string> = {
      capital: [
         t('Капитал {{amount}}', { amount: formatUsd(data.capital, language) }),
         t('свободный остаток считается из банковских выписок'),
         t('последняя выписка — {{date}}', { date: statement }),
      ].join(' · '),
      budget: [
         t('Бюджет {{year}} в млн сум', { year: data.plan.year }),
         t(
            'план загружается раз в год, факт считается автоматически из банковских выписок',
         ),
         t('отчётность прикрепляется файлами'),
         t('главный бухгалтер Г. Абдуллаева'),
      ].join(' · '),
      actuals: [
         t('Фактические данные — из банковских выписок'),
         t('последняя выписка {{date}}', { date: statement }),
         t('{{count}} операция ждёт статьи', { count: waiting }),
      ].join(' · '),
      payments: t(
         'Платежи по сделкам после решений ИК и НС — с проверкой оснований',
      ),
   };

   const actions: Record<FinanceTab, ReactNode> = {
      capital: (
         <>
            <Button variant='ghost' onClick={() => window.print()}>
               {t('Выгрузить для НС')}
            </Button>
            <Button onClick={() => setPaying(true)}>
               {t('Новый платёж по сделке')}
            </Button>
         </>
      ),
      budget: (
         <>
            <Button
               variant='ghost'
               onClick={() => budgetInput.current?.click()}
            >
               {t('Загрузить бюджет')}
            </Button>
            <input
               ref={budgetInput}
               hidden
               accept='.xlsx,.xls,.csv'
               type='file'
               onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) finance.uploadBudget(file.name);
                  event.target.value = '';
               }}
            />
            <Button onClick={() => setAttaching(true)}>
               {t('Прикрепить документ')}
            </Button>
         </>
      ),
      actuals: (
         <>
            <Button variant='ghost' onClick={exportActuals}>
               {t('Выгрузить отчёты')}
            </Button>
            <Button onClick={() => statementInput.current?.click()}>
               {t('Загрузить выписку')}
            </Button>
            <input
               ref={statementInput}
               hidden
               multiple
               accept='.xlsx,.xls'
               type='file'
               onChange={(event) => {
                  const names = [...(event.target.files ?? [])].map(
                     ({ name }) => name,
                  );
                  if (names.length) finance.uploadStatements(names);
                  event.target.value = '';
               }}
            />
         </>
      ),
      payments: (
         <Button onClick={() => setPaying(true)}>
            {t('Новый платёж по сделке')}
         </Button>
      ),
   };

   return (
      <>
         <PageHeader
            actions={actions[tab]}
            meta={meta[tab]}
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
               onChange={select}
            />
         </PageHeader>
         <PageBody className='flex flex-col'>
            {tab === 'capital' && (
               <Capital data={data} onActuals={() => select('actuals')} />
            )}
            {tab === 'budget' && (
               <Budget data={data} onActuals={() => select('actuals')} />
            )}
            {tab === 'actuals' && <Actuals data={data} />}
            {tab === 'payments' && <Payments data={data} />}
         </PageBody>
         <NewPaymentDialog
            open={paying}
            taken={data.payments
               .filter(({ status }) => status !== 'paid')
               .flatMap(({ dealId }) => (dealId ? [dealId] : []))}
            onClose={() => setPaying(false)}
         />
         <AttachDialog
            data={data}
            open={attaching}
            onClose={() => setAttaching(false)}
         />
      </>
   );
};

export default FinancePage;
