import DeleteListItemDialog from '@modules/Settings/components/DeleteListItemDialog';
import DeleteStageDialog from '@modules/Settings/components/DeleteStageDialog';
import ListItemDialog from '@modules/Settings/components/ListItemDialog';
import StaffDialog from '@modules/Settings/components/StaffDialog';
import StageDialog from '@modules/Settings/components/StageDialog';
import {
   DEFAULT_SECTION,
   FLAG_FIELDS,
   LIST_SECTIONS,
   MANDATE_FIELDS,
   SETTINGS_SECTION_IDS,
   sectionInfo,
   type SettingsSection,
} from '@modules/Settings/constants';
import settings, { parseCheck } from '@modules/Settings/services';
import { Button, Loading, PageHeader } from '@shared/components';
import { SETTINGS_PATH } from '@shared/constants';
import { useAction, useCurrentUser, useServiceData } from '@shared/hooks';
import type {
   ListItem,
   SettingsState,
   StaffCredentials,
   StaffMember,
   StageItem,
} from '@shared/types/settings.types';
import { UserPlus } from 'lucide-react';
import CredentialsDialog from '@modules/Settings/components/CredentialsDialog';
import { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useParams } from 'react-router';
import {
   Committee,
   Flags,
   Integrations,
   Journal,
   ListSection,
   Mandate,
   PersonWork,
   Questionnaire,
   Roles,
   SectionHeader,
   SettingsNav,
   Stages,
   Users,
   Vendors,
} from './components';

const load = () => settings.getSettings();
const subscribe = (listener: () => void) => settings.subscribe(listener);

export type Draft = Pick<SettingsState, 'mandate' | 'flags'>;

const draftOf = (data: SettingsState): Draft => ({
   mandate: data.mandate,
   flags: data.flags,
});

// The sections whose values are saved with «Сохранить», and the part of the
// draft each holds.
const DRAFT_PARTS: Partial<Record<SettingsSection, keyof Draft>> = {
   mandate: 'mandate',
   flags: 'flags',
};

const isSection = (value: string | undefined): value is SettingsSection =>
   SETTINGS_SECTION_IDS.some((id) => id === value);

/* Настройки, as the prototype draws them: the sections in their groups on
   the left, the section on the right under its own title. The lists, the
   stages and the people are changed where they stand and saved at once; the
   mandate and the flags keep one draft across their sections, saved with
   «Сохранить», so moving between them does not lose what was typed. The
   address keeps the section (/settings/rounds). Only the director changes
   anything; every change goes to the journal. */
const SettingsPage = () => {
   const { t } = useTranslation('settings');
   const user = useCurrentUser();
   const data = useServiceData(load, subscribe);
   const { section: param } = useParams();
   const [draft, setDraft] = useState<Draft | null>(null);
   // the person in the dialog: null closed, 'new' a new one
   const [person, setPerson] = useState<StaffMember | 'new' | null>(null);
   // the person whose deals and tasks are open
   const [personWork, setPersonWork] = useState<StaffMember | null>(null);
   // the sign-in just made, to hand over
   const [credentials, setCredentials] = useState<StaffCredentials | null>(null);
   const [adding, setAdding] = useState(false); // a new row of a list
   const [addingStage, setAddingStage] = useState(false);
   // the row or the stage asked to be deleted
   const [removing, setRemoving] = useState<ListItem | null>(null);
   const [removingStage, setRemovingStage] = useState<StageItem | null>(null);
   const title = t('Настройки');
   const director = user.role === 'director';

   const saving = useAction(async (next: Draft) => {
      const labels: Record<string, string> = {};
      MANDATE_FIELDS.forEach(({ key, label }) => {
         labels[`mandate.${key}`] = t('Мандат · {{field}}', {
            field: t(label),
         });
      });
      FLAG_FIELDS.forEach(({ key, label }) => {
         labels[`flag.${key}`] = t('Флаг · {{field}}', { field: t(label) });
      });
      await settings.save(next, user.id, labels);
      setDraft(null);
   });

   useEffect(() => {
      if (data && !draft) setDraft(draftOf(data));
   }, [data, draft]);

   if (!isSection(param))
      return <Navigate replace to={`${SETTINGS_PATH}/${DEFAULT_SECTION}`} />;
   const section = param;
   const info = sectionInfo(section);
   const header = (
      <PageHeader
         bare
         section={
            <Link className='hover:text-ink' to={SETTINGS_PATH}>
               {title}
            </Link>
         }
         title={t(info.label)}
      />
   );

   if (!data || !draft)
      return (
         <>
            {header}
            <Loading />
         </>
      );

   const kind = LIST_SECTIONS[section as keyof typeof LIST_SECTIONS];

   // a check the panel cannot read would be saved as no check at all
   const checkError =
      draft.mandate.check.trim() && !parseCheck(draft.mandate.check)
         ? t('Напишите две суммы, от и до: $50 000 – $300 000')
         : '';

   const changed = (part: keyof Draft) =>
      JSON.stringify(draft[part]) !== JSON.stringify(data[part]);
   const unsaved = (Object.keys(DRAFT_PARTS) as SettingsSection[]).filter(
      (id) => changed(DRAFT_PARTS[id]!),
   );

   const actions = (): ReactNode => {
      if (DRAFT_PARTS[section])
         return (
            <>
               {unsaved.length > 0 && (
                  <Button
                     disabled={saving.pending}
                     variant='ghost'
                     onClick={() => setDraft(draftOf(data))}
                  >
                     {t('Отменить изменения')}
                  </Button>
               )}
               <Button
                  disabled={!unsaved.length || !director || !!checkError}
                  loading={saving.pending}
                  title={
                     director
                        ? undefined
                        : t('Менять правила может только директор')
                  }
                  onClick={() => saving.run(draft)}
               >
                  {t('Сохранить')}
               </Button>
            </>
         );
      if (section === 'users')
         return (
            <Button
               disabled={!director}
               title={director ? undefined : t('Приглашает директор')}
               onClick={() => setPerson('new')}
            >
               <UserPlus aria-hidden />
               {t('Добавить')}
            </Button>
         );
      return null;
   };

   const content = () => {
      if (kind)
         return (
            <ListSection
               editable={director}
               items={data.lists[kind]}
               kind={kind}
               onAdd={() => setAdding(true)}
               onDelete={setRemoving}
            />
         );
      switch (section) {
         case 'mandate':
            return (
               <Mandate
                  data={data}
                  draft={draft}
                  editable={director}
                  errors={{ check: checkError }}
                  onChange={setDraft}
               />
            );
         case 'stages':
            return (
               <Stages
                  editable={director}
                  removed={data.removedStages}
                  stages={data.stages}
                  onAdd={() => setAddingStage(true)}
                  onDelete={setRemovingStage}
               />
            );
         case 'flags':
            return (
               <Flags draft={draft} editable={director} onChange={setDraft} />
            );
         case 'questionnaire':
            return (
               <Questionnaire
                  editable={director && data.questionnaireStored}
                  sections={data.questionnaire}
                  stored={data.questionnaireStored}
               />
            );
         case 'committee':
            return <Committee />;
         case 'vendors':
            return (
               <Vendors
                  editable={director && data.vendorsStored}
                  stored={data.vendorsStored}
                  vendors={data.vendors}
               />
            );
         case 'users':
            return (
               <Users
                  editable={director}
                  staff={data.staff}
                  onCredentials={setCredentials}
                  onEdit={setPerson}
                  onWork={setPersonWork}
               />
            );
         case 'roles':
            return <Roles staff={data.staff} />;
         case 'integrations':
            return <Integrations />;
         case 'journal':
            return <Journal journal={data.journal} />;
         default:
            return null;
      }
   };

   /* On a wide screen the page itself stands still, 20px in from every side:
      the menu and the section scroll each in its own column, the section's
      title staying above what scrolls. On a narrow one the page scrolls. */
   return (
      <>
         {header}
         <div className='flex flex-1 flex-col gap-4 px-5 pt-5 lg:grid lg:h-[calc(100dvh-3.375rem)] lg:flex-none lg:grid-cols-[200px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:gap-5 lg:overflow-hidden'>
            <SettingsNav active={section} unsaved={unsaved} />
            <section key={section} className='flex min-w-0 flex-col lg:min-h-0'>
               <SectionHeader
                  actions={actions()}
                  meta={t(info.meta)}
                  title={t(info.label)}
               />
               {/* its scrollbar at the page's edge, the 20px inside it; a
                   dragged row scrolls it near its edges */}
               <div
                  data-scroll-area
                  className='pb-5 lg:-mr-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-5'
               >
                  {content()}
               </div>
            </section>
         </div>
         <StaffDialog
            member={person === 'new' ? null : person}
            open={person !== null}
            onClose={() => setPerson(null)}
            onCreated={setCredentials}
         />
         <CredentialsDialog
            credentials={credentials}
            onClose={() => setCredentials(null)}
         />
         <PersonWork
            editable={director}
            member={personWork}
            onClose={() => setPersonWork(null)}
         />
         <StageDialog
            open={addingStage}
            onClose={() => setAddingStage(false)}
         />
         <DeleteStageDialog
            stage={removingStage}
            onClose={() => setRemovingStage(null)}
         />
         {kind && (
            <>
               <ListItemDialog
                  kind={kind}
                  open={adding}
                  onClose={() => setAdding(false)}
               />
               <DeleteListItemDialog
                  item={removing}
                  kind={kind}
                  onClose={() => setRemoving(null)}
               />
            </>
         )}
      </>
   );
};

export default SettingsPage;
