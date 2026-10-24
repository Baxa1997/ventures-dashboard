import { stageName } from '@modules/Settings/services';
import { IC_RULES } from '@modules/Committee/constants';
import { readinessOf } from '@modules/Deals/helpers';
import deals from '@modules/Deals/services';
import {
   Button,
   Card,
   CheckList,
   ConfirmDialog,
   Field,
   ItemActions,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
   Progress,
} from '@shared/components';
import { addWorkingDays, formatDate } from '@shared/helpers';
import type { CheckItem, Deal } from '@shared/types/deals.types';
import { type FormEvent, type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useAction, useRequest } from '@shared/hooks';

interface ReadinessCardProps {
   deal: Deal;
   editable: boolean;
}

// The tab of the card where an item the panel counts is worked on.
const ITEM_TABS = [
   ['memo', 'memo', 'Открыть меморандум'],
   ['stream-', 'dd', 'Открыть «Due diligence»'],
   ['request-', 'requests', 'Открыть «Запросы и документы»'],
   ['document-', 'requests', 'Открыть «Запросы и документы»'],
] as const;

/* «Готовность к ИК»: the materials the deal needs for its committee, before
   the meeting. The panel ticks what it sees done (the memorandum approved,
   DD's conclusions, the company's answers); the owner adds and ticks what it
   cannot see. The meeting's secretary sends the materials out once every
   question has all of them. */
const ReadinessCard = ({ deal, editable }: ReadinessCardProps) => {
   const { t } = useTranslation('deals');
   const [text, setText] = useState('');
   // the owner's item being changed, or asked to be deleted
   const [editing, setEditing] = useState<CheckItem | null>(null);
   const [removing, setRemoving] = useState<CheckItem | null>(null);
   const adding = useRequest({ kind: 'create', success: t('Пункт добавлен') });
   // the item whose tick is being saved
   const [ticking, setTicking] = useState('');
   const toggling = useAction(
      (id: string) => deals.toggleReadinessItem(deal.id, id),
      { success: t('Отметка сохранена') },
   );
   const items = readinessOf(t, deal);
   const own = new Set((deal.readiness?.items ?? []).map(({ id }) => id));
   const counted = items.filter(({ id }) => !own.has(id));
   const added = items.filter(({ id }) => own.has(id));
   const done = items.filter(({ state }) => state === 'done').length;
   const meeting = deal.committee;
   const body = deal.stage === 'board' ? t('НС') : t('ИК');

   const actions: Record<string, ReactNode> = {};
   for (const item of counted) {
      if (item.state === 'done') continue;
      const tab = ITEM_TABS.find(([prefix]) => item.id.startsWith(prefix));
      if (tab)
         actions[item.id] = (
            <Link className='link text-xs' to={`?tab=${tab[1]}`}>
               {t(tab[2])}
            </Link>
         );
   }
   const removable: Record<string, ReactNode> = {};
   if (editable)
      for (const item of added)
         removable[item.id] = (
            <ItemActions
               className='text-xs'
               name={item.text}
               onDelete={() => setRemoving(item)}
               onEdit={() => setEditing(item)}
            />
         );

   const add = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const value = text.trim();
      if (
         value &&
         (await adding.run(() => deals.addReadinessItem(deal.id, value)))
      )
         setText('');
   };

   const toggle = async (id: string) => {
      setTicking(id);
      await toggling.run(id);
      setTicking('');
   };

   return (
      <Card
         hint={
            meeting
               ? `${formatDate(meeting.date)}, ${meeting.time}`
               : t('заседание не назначено')
         }
         title={
            meeting
               ? t('Готовность к {{body}} № {{number}}', {
                    body,
                    number: meeting.number,
                 })
               : t('Готовность к «{{stage}}»', {
                    stage: stageName(deal.stage),
                 })
         }
      >
         <div className='p-5'>
            <div className='flex items-center gap-4'>
               <Progress
                  className='h-1.5 flex-1'
                  max={Math.max(items.length, 1)}
                  value={done}
               />
               <span className='text-meta font-semibold'>
                  {t('{{done}} из {{total}}', { done, total: items.length })}
               </span>
            </div>
            <CheckList
               actions={actions}
               className='text-meta mt-4'
               items={counted}
            />
            {added.length > 0 && (
               <CheckList
                  actions={removable}
                  busyId={ticking || undefined}
                  className='text-meta mt-3'
                  items={added}
                  onToggle={editable ? toggle : undefined}
               />
            )}
            {editable && (
               <form className='mt-4 flex gap-2' onSubmit={add}>
                  <input
                     aria-label={t('Ещё один пункт')}
                     className='field-input min-w-0 flex-1'
                     maxLength={160}
                     placeholder={t('Ещё один пункт')}
                     value={text}
                     onChange={(event) => setText(event.target.value)}
                  />
                  <Button
                     disabled={!text.trim()}
                     loading={adding.pending}
                     type='submit'
                     variant='ghost'
                  >
                     {t('Добавить')}
                  </Button>
               </form>
            )}
            <p className='text-ink-soft mt-4 text-xs'>
               {meeting
                  ? t(
                       'Материалы уходят членам не позднее {{date}} — за {{count}} рабочий день до заседания.',
                       {
                          date: formatDate(
                             addWorkingDays(
                                meeting.date,
                                -IC_RULES.materialsDays,
                             ),
                          ),
                          count: IC_RULES.materialsDays,
                       },
                    )
                  : t(
                       'Материалы уходят членам за {{count}} рабочий день до заседания.',
                       { count: IC_RULES.materialsDays },
                    )}
            </p>
         </div>
         <Modal
            open={editing !== null}
            subtitle={deal.company}
            title={t('Пункт готовности')}
            onClose={() => setEditing(null)}
         >
            {editing && (
               <ItemForm
                  key={editing.id}
                  dealId={deal.id}
                  item={editing}
                  onClose={() => setEditing(null)}
               />
            )}
         </Modal>
         <ConfirmDialog
            open={removing !== null}
            subtitle={removing?.text}
            title={t('Удалить пункт?')}
            onClose={() => setRemoving(null)}
            onConfirm={() =>
               removing && deals.removeReadinessItem(deal.id, removing.id)
            }
         />
      </Card>
   );
};

interface ItemFormProps {
   dealId: string;
   item: CheckItem;
   onClose: () => void;
}

// The wording of an item the owner added.
const ItemForm = ({ dealId, item, onClose }: ItemFormProps) => {
   const { t } = useTranslation('deals');
   const [text, setText] = useState(item.text);
   const saving = useRequest();

   const submit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!text.trim()) return;
      if (
         await saving.run(async () => {
            await deals.updateReadinessItem(dealId, item.id, text.trim());
         })
      )
         onClose();
   };

   return (
      <form noValidate className={MODAL_FORM} onSubmit={submit}>
         <ModalBody>
            <Field label={t('Пункт')}>
               <input
                  data-autofocus
                  className='field-input'
                  maxLength={160}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
               />
            </Field>
         </ModalBody>
         <ModalFooter>
            <Button variant='text' onClick={onClose}>
               {t('Отмена')}
            </Button>
            <Button
               disabled={!text.trim()}
               loading={saving.pending}
               type='submit'
            >
               {t('Сохранить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

export default ReadinessCard;
