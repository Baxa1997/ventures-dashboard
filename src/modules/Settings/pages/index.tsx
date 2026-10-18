import InviteDialog from '@modules/Settings/components/InviteDialog';
import JournalDialog from '@modules/Settings/components/JournalDialog';
import {
   FLAG_FIELDS,
   MANDATE_FIELDS,
   NORM_STAGE_LABELS,
   type SettingsTab,
   TAB_LABELS,
   TABS,
} from '@modules/Settings/constants';
import settings from '@modules/Settings/services';
import {
   Button,
   Loading,
   PageBody,
   PageHeader,
   Tabs,
} from '@shared/components';
import { useCurrentUser, useServiceData } from '@shared/hooks';
import type { SettingsState } from '@shared/types/settings.types';
import { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { Integrations, Lists, Rules, Users } from './components';

const toTab = (value: string | null): SettingsTab =>
   TABS.find((tab) => tab === value) ?? 'rules';

const load = () => settings.getSettings();
const subscribe = (listener: () => void) => settings.subscribe(listener);

export type Draft = Pick<SettingsState, 'mandate' | 'norms' | 'flags'>;

/* Настройки: the rules the system counts deadlines, checks applications and
   raises flags by, and who may do what. Only the director changes the rules;
   every change goes to the journal. The address keeps the tab. */
const SettingsPage = () => {
   const { t } = useTranslation('settings');
   const user = useCurrentUser();
   const data = useServiceData(load, subscribe);
   const [params, setParams] = useSearchParams();
   const tab = toTab(params.get('tab'));
   const [draft, setDraft] = useState<Draft | null>(null);
   const [journal, setJournal] = useState(false);
   const [inviting, setInviting] = useState(false);
   const title = t('Настройки');
   const director = user.role === 'director';

   useEffect(() => {
      if (data && !draft)
         setDraft({
            mandate: data.mandate,
            norms: data.norms,
            flags: data.flags,
         });
   }, [data, draft]);

   if (!data || !draft)
      return (
         <>
            <PageHeader title={title} />
            <Loading />
         </>
      );

   const dirty =
      JSON.stringify(draft) !==
      JSON.stringify({
         mandate: data.mandate,
         norms: data.norms,
         flags: data.flags,
      });

   const save = async () => {
      const labels: Record<string, string> = {};
      MANDATE_FIELDS.forEach(({ key, label }) => {
         labels[`mandate.${key}`] = t('Мандат · {{field}}', {
            field: t(label),
         });
      });
      data.norms.forEach(({ stage }) => {
         labels[`norm.${stage}`] = t('Норматив · {{stage}}', {
            stage: t(NORM_STAGE_LABELS[stage]),
         });
      });
      FLAG_FIELDS.forEach(({ key, label }) => {
         labels[`flag.${key}`] = t('Флаг · {{field}}', { field: t(label) });
      });
      await settings.save(draft, user.id, labels);
      setDraft(null);
   };

   const actions: Record<SettingsTab, ReactNode> = {
      rules: (
         <>
            <Button variant='ghost' onClick={() => setJournal(true)}>
               {t('Журнал изменений')}
            </Button>
            <Button
               disabled={!dirty || !director}
               title={
                  director
                     ? undefined
                     : t('Менять правила может только директор')
               }
               onClick={save}
            >
               {t('Сохранить')}
            </Button>
         </>
      ),
      users: (
         <Button
            disabled={!director}
            title={director ? undefined : t('Приглашает директор')}
            onClick={() => setInviting(true)}
         >
            {t('Пригласить пользователя')}
         </Button>
      ),
      lists: null,
      integrations: null,
   };

   const meta: Record<SettingsTab, string> = {
      rules: t(
         'Правила, по которым система считает сроки, проверяет заявки и поднимает флаги. Менять их может только директор, каждое изменение попадает в журнал',
      ),
      users: t(
         'Роль задаёт права, человек может совмещать несколько ролей. Внешние участники входят только в свой раздел.',
      ),
      lists: t('Справочники, которые используют формы и проверки платформы'),
      integrations: t('Откуда платформа берёт данные и куда их отдаёт'),
   };

   return (
      <>
         <PageHeader actions={actions[tab]} meta={meta[tab]} title={title}>
            <Tabs
               active={tab}
               items={TABS.map((id) => ({
                  id,
                  label: t(TAB_LABELS[id]),
                  count: id === 'users' ? data.staff.length : undefined,
               }))}
               label={title}
               onChange={(next) =>
                  setParams(next === 'rules' ? {} : { tab: next }, {
                     replace: true,
                  })
               }
            />
         </PageHeader>
         <PageBody className='flex flex-col'>
            {tab === 'rules' && (
               <Rules draft={draft} editable={director} onChange={setDraft} />
            )}
            {tab === 'users' && <Users data={data} />}
            {tab === 'lists' && <Lists data={data} />}
            {tab === 'integrations' && <Integrations />}
         </PageBody>
         <JournalDialog
            data={data}
            open={journal}
            onClose={() => setJournal(false)}
         />
         <InviteDialog open={inviting} onClose={() => setInviting(false)} />
      </>
   );
};

export default SettingsPage;
