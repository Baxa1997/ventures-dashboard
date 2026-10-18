import RemindDialog from '@modules/Portfolio/components/RemindDialog';
import {
   LIST_TAB_LABELS,
   LIST_TABS,
   type ListTab,
   REPORT_DOCS,
} from '@modules/Portfolio/constants';
import {
   isOverdue,
   quarterLabel,
   quarterName,
   receivedCount,
} from '@modules/Portfolio/helpers';
import { usePortfolio } from '@modules/Portfolio/hooks';
import {
   Button,
   Loading,
   PageBody,
   PageHeader,
   Tabs,
} from '@shared/components';
import { formatDate, formatUsd } from '@shared/helpers';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { Companies, Pilots, Reports, Requests } from './components';

const toTab = (value: string | null): ListTab =>
   LIST_TABS.find((tab) => tab === value) ?? 'companies';

/* Портфель: the companies, their quarterly reporting, what they ask the fund
   for and their pilots with the bank. The address keeps the tab. */
const PortfolioList = () => {
   const { t, i18n } = useTranslation('portfolio');
   const { t: tLayout } = useTranslation('layout');
   const data = usePortfolio();
   const [params, setParams] = useSearchParams();
   const tab = toTab(params.get('tab'));
   const [reminding, setReminding] = useState(false);
   const language = i18n.resolvedLanguage ?? i18n.language;
   const title = t('Портфель');

   if (!data)
      return (
         <>
            <PageHeader section={tLayout('Инвестиции')} title={title} />
            <Loading />
         </>
      );

   const { companies, requests, cycle } = data;
   const open = requests.filter(({ status }) => status !== 'closed');
   const invested = companies.reduce(
      (sum, { invested: value }) => sum + value,
      0,
   );
   const counts: Record<ListTab, number> = {
      companies: companies.length,
      reports: companies.reduce(
         (sum, company) => sum + receivedCount(company, cycle.quarter),
         0,
      ),
      requests: open.length,
      pilots: companies.reduce((sum, { pilots }) => sum + pilots.length, 0),
   };

   const meta: Record<ListTab, string> = {
      companies: [
         t('{{count}} компания', { count: companies.length }),
         t('вложено {{amount}}', { amount: formatUsd(invested, language) }),
         t('следующая отчётность — {{quarter}}, срок {{date}}', {
            quarter: quarterName(t, cycle.quarter),
            date: formatDate(cycle.due),
         }),
      ].join(' · '),
      reports: [
         quarterLabel(t, cycle.quarter, true),
         t('от каждой компании {{count}} документ', {
            count: REPORT_DOCS.length,
         }),
         t('срок сдачи {{date}}', { date: formatDate(cycle.due) }),
      ].join(' · '),
      requests: [
         t('{{count}} открытый запрос', { count: open.length }),
         t('{{count}} ждёт ответа фонда больше 5 дней', {
            count: open.filter(isOverdue).length,
         }),
      ].join(' · '),
      pilots: t('Пилоты портфельных компаний с бизнес-линиями SQB'),
   };

   const remindButton = (label: string) => (
      <Button onClick={() => setReminding(true)}>{label}</Button>
   );
   const actions: Record<ListTab, ReactNode> = {
      companies: (
         <>
            <Button variant='ghost' onClick={() => window.print()}>
               {t('Выгрузить для НС')}
            </Button>
            {remindButton(t('Запросить отчёты'))}
         </>
      ),
      reports: remindButton(t('Напомнить компаниям')),
      requests: null,
      pilots: null,
   };

   return (
      <>
         <PageHeader
            actions={actions[tab]}
            meta={meta[tab]}
            section={tLayout('Инвестиции')}
            title={title}
         >
            <Tabs
               active={tab}
               items={LIST_TABS.map((id) => ({
                  id,
                  label: t(LIST_TAB_LABELS[id]),
                  count: counts[id],
               }))}
               label={title}
               onChange={(next) =>
                  setParams(next === 'companies' ? {} : { tab: next }, {
                     replace: true,
                  })
               }
            />
         </PageHeader>
         <PageBody className='flex flex-col'>
            {tab === 'companies' && <Companies data={data} />}
            {tab === 'reports' && <Reports data={data} />}
            {tab === 'requests' && <Requests data={data} />}
            {tab === 'pilots' && <Pilots data={data} />}
         </PageBody>
         <RemindDialog
            data={data}
            open={reminding}
            onClose={() => setReminding(false)}
         />
      </>
   );
};

export default PortfolioList;
