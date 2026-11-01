import {
   Button,
   Card,
   ConfirmDialog,
   Field,
   ItemActions,
   Modal,
   MODAL_FORM,
   ModalBody,
   ModalFooter,
   NoData,
   Switch,
} from '@shared/components';
import type { SiteSource, SiteSourceKind } from '@shared/types/site.types';
import { Plus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { moved } from '../../helpers';
import { useSiteSave } from '../../hooks';
import site from '../../services';
import { LocalizedRow, OnSite, OrderButtons } from './parts';

const SourceDialog = ({
   source,
   onClose,
}: {
   source: SiteSource;
   onClose: () => void;
}) => {
   const { t } = useTranslation('site');
   const [value, setValue] = useState(source);
   const ready = Boolean(value.name.trim());
   const saving = useSiteSave(() => site.save('sources', value));
   const submit = async (event: FormEvent) => {
      event.preventDefault();
      if (ready && (await saving.run())) onClose();
   };
   return (
      <form noValidate className={MODAL_FORM} onSubmit={submit}>
         <ModalBody>
            <div className='grid gap-4'>
               <div className='grid gap-3 md:grid-cols-2'>
                  <Field label={t('Название')}>
                     <input
                        data-autofocus
                        className='field-input'
                        value={value.name}
                        onChange={(event) =>
                           setValue({ ...value, name: event.target.value })
                        }
                     />
                  </Field>
                  <Field label={t('Ссылка')}>
                     <input
                        className='field-input'
                        inputMode='url'
                        placeholder='https://'
                        value={value.url}
                        onChange={(event) =>
                           setValue({ ...value, url: event.target.value })
                        }
                     />
                  </Field>
               </div>
               <LocalizedRow
                  label={t('Описание')}
                  rows={3}
                  value={value.text}
                  onChange={(text) => setValue({ ...value, text })}
               />
            </div>
         </ModalBody>
         <ModalFooter>
            <Button
               hint={t('Закрыть окно, ничего не меняя')}
               variant='text'
               onClick={onClose}
            >
               {t('Отмена')}
            </Button>
            <Button
               disabled={!ready}
               hint={
                  ready
                     ? t('Сохранить и сразу показать на сайте')
                     : t('Напишите название')
               }
               loading={saving.pending}
               type='submit'
            >
               {t('Сохранить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

const GROUPS: { kind: SiteSourceKind; title: string; add: string }[] = [
   { kind: 'media', title: 'Медиа, которые мы читаем', add: 'Добавить медиа' },
   { kind: 'report', title: 'Отраслевые отчёты', add: 'Добавить отчёт' },
];

const Sources = ({ sources }: { sources: SiteSource[] }) => {
   const { t } = useTranslation('site');
   const [editing, setEditing] = useState<SiteSource | null>(null);
   const [removing, setRemoving] = useState<SiteSource | null>(null);
   const moving = useSiteSave((list: SiteSource[]) =>
      site.reorder('sources', list),
   );
   const showing = useSiteSave((id: string, shown: boolean) =>
      site.setShown('sources', id, shown),
   );

   return (
      <div className='grid gap-4'>
         <div className='flex justify-end'>
            <OnSite path='/news/reports' />
         </div>
         {GROUPS.map(({ kind, title, add }) => {
            const list = sources.filter((source) => source.kind === kind);
            return (
               <Card
                  key={kind}
                  action={
                     <Button
                        hint={t(add as never)}
                        size='sm'
                        variant='ghost'
                        onClick={() =>
                           setEditing(site.newSource(kind, list.length + 1))
                        }
                     >
                        <Plus aria-hidden />
                        {t(add as never)}
                     </Button>
                  }
                  hint={list.length}
                  title={t(title as never)}
               >
                  {list.length ? (
                     <ul className='divide-line divide-y'>
                        {list.map((source, index) => (
                           <li
                              key={source.id}
                              className='flex items-center gap-3 px-4.5 py-2.5'
                           >
                              <OrderButtons
                                 busy={moving.pending}
                                 first={index === 0}
                                 last={index === list.length - 1}
                                 name={source.name}
                                 onMove={(step) => {
                                    const next = moved(list, source.id, step);
                                    if (next) void moving.run(next);
                                 }}
                              />
                              <div className='min-w-0 flex-1'>
                                 <button
                                    type='button'
                                    className='text-left font-semibold'
                                    data-hint={t('Открыть источник')}
                                    onClick={() => setEditing(source)}
                                 >
                                    {source.name}
                                 </button>
                                 {source.url && (
                                    <div className='text-ink-faint truncate text-xs'>
                                       {source.url}
                                    </div>
                                 )}
                              </div>
                              <Switch
                                 small
                                 checked={source.visible}
                                 disabled={showing.pending}
                                 hint={
                                    source.visible
                                       ? t('Скрыть источник с сайта')
                                       : t('Показать источник на сайте')
                                 }
                                 label={source.name}
                                 onChange={(next) =>
                                    void showing.run(source.id, next)
                                 }
                              />
                              <ItemActions
                                 icons
                                 name={source.name}
                                 onDelete={() => setRemoving(source)}
                                 onEdit={() => setEditing(source)}
                              />
                           </li>
                        ))}
                     </ul>
                  ) : (
                     <NoData>{t('В этом списке пока ничего нет')}</NoData>
                  )}
               </Card>
            );
         })}
         <Modal
            open={editing !== null}
            size='wide'
            title={editing?.id ? t('Источник') : t('Новый источник')}
            onClose={() => setEditing(null)}
         >
            {editing && (
               <SourceDialog
                  source={editing}
                  onClose={() => setEditing(null)}
               />
            )}
         </Modal>
         <ConfirmDialog
            open={removing !== null}
            subtitle={removing?.name}
            success={t('Источник удалён')}
            title={t('Удалить источник?')}
            onClose={() => setRemoving(null)}
            onConfirm={() => removing && site.remove('sources', removing.id)}
         >
            <p>{t('Он пропадёт с сайта, вернуть его будет нельзя.')}</p>
         </ConfirmDialog>
      </div>
   );
};

export default Sources;
