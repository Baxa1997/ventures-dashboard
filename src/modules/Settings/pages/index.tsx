import InviteDialog from '@modules/Settings/components/InviteDialog';
import DeleteListItemDialog from '@modules/Settings/components/DeleteListItemDialog';
import DeleteStageDialog from '@modules/Settings/components/DeleteStageDialog';
import ListItemDialog from '@modules/Settings/components/ListItemDialog';
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
import { Button, Loading, PageBody, PageHeader } from '@shared/components';
import { SETTINGS_PATH } from '@shared/constants';
import { useAction, useCurrentUser, useServiceData } from '@shared/hooks';
import type {
   ListItem,
   SettingsState,
   StageItem,
} from '@shared/types/settings.types';
import { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useParams } from 'react-router';
import {
   Committee,
   Flags,
   Integrations,
   Journal,
   ListSection,
   Mandate,
   SettingsNav,
   Stages,
   Users,
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

/* Настройки: the rules the platform works by — the mandate, the stage norms,
   the portfolio's flags — and the lists its forms offer, the team, the
   integrations and the journal of changes. The address keeps the section
   (/settings/rounds). Only the director changes the rules and the lists; every
   change goes to the journal. The rules keep one draft across their sections,
   so moving between them does not lose what was typed. */
const SettingsPage = () => {
   const { t } = useTranslation('settings');
   const user = useCurrentUser();
   const data = useServiceData(load, subscribe);
   const { section: param } = useParams();
   const [draft, setDraft] = useState<Draft | null>(null);
   const [inviting, setInviting] = useState(false);
   // the list row being edited: null closed, 'new' a new row
   const [editing, setEditing] = useState<ListItem | 'new' | null>(null);
   const [stage, setStage] = useState<StageItem | 'new' | null>(null);
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

   if (!data || !draft)
      return (
         <>
            <PageHeader title={title} />
            <Loading />
         </>
      );

   const info = sectionInfo(section);
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

   const saveButton = (
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
               director ? undefined : t('Менять правила может только директор')
            }
            onClick={() => saving.run(draft)}
         >
            {t('Сохранить')}
         </Button>
      </>
   );

   const actions = (): ReactNode => {
      if (DRAFT_PARTS[section]) return saveButton;
      if (kind)
         return (
            <Button
               disabled={!director}
               title={
                  director
                     ? undefined
                     : t('Менять справочники может только директор')
               }
               onClick={() => setEditing('new')}
            >
               {t('Добавить')}
            </Button>
         );
      if (section === 'stages')
         return (
            <Button
               disabled={!director}
               title={
                  director ? undefined : t('Менять этапы может только директор')
               }
               onClick={() => setStage('new')}
            >
               {t('Добавить этап')}
            </Button>
         );
      if (section === 'users')
         return (
            <Button
               disabled={!director}
               title={director ? undefined : t('Приглашает директор')}
               onClick={() => setInviting(true)}
            >
               {t('Пригласить пользователя')}
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
               onDelete={setRemoving}
               onEdit={setEditing}
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
                  onDelete={setRemovingStage}
                  onEdit={setStage}
               />
            );
         case 'flags':
            return (
               <Flags draft={draft} editable={director} onChange={setDraft} />
            );
         case 'committee':
            return <Committee />;
         case 'users':
            return <Users data={data} />;
         case 'integrations':
            return <Integrations />;
         case 'journal':
            return <Journal data={data} />;
         default:
            return null;
      }
   };

   return (
      <>
         <PageHeader
            actions={actions()}
            meta={t(info.meta)}
            section={title}
            title={t(info.label)}
         />
         <PageBody className='gap-section grid content-start lg:grid-cols-[13rem_minmax(0,1fr)]'>
            <SettingsNav
               active={section}
               counts={data.lists}
               staff={data.staff.length}
               unsaved={unsaved}
            />
            {/* the section's card grows to the menu's height, so the two end level */}
            <div className='flex min-w-0 flex-col [&>:last-child]:flex-1'>
               {content()}
            </div>
         </PageBody>
         <InviteDialog open={inviting} onClose={() => setInviting(false)} />
         <StageDialog
            open={stage !== null}
            stage={stage === 'new' ? null : stage}
            onClose={() => setStage(null)}
         />
         <DeleteStageDialog
            stage={removingStage}
            onClose={() => setRemovingStage(null)}
         />
         {kind && (
            <>
               <ListItemDialog
                  item={editing === 'new' ? null : editing}
                  kind={kind}
                  open={editing !== null}
                  onClose={() => setEditing(null)}
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
