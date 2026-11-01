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
   RichTextEditor,
   Switch,
   Table,
   TD,
   TH,
} from '@shared/components';
import type { SiteLanguage, SiteLegal } from '@shared/types/site.types';
import { Plus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { emptyLocalized, filledIn, firstOf, slugOf } from '../../helpers';
import { useSiteSave } from '../../hooks';
import site from '../../services';
import { LangMarks, LangTabs, OnSite } from './parts';

const LegalDialog = ({
   page,
   slugs,
   onClose,
}: {
   page: SiteLegal;
   slugs: string[];
   onClose: () => void;
}) => {
   const { t } = useTranslation('site');
   const [value, setValue] = useState(page);
   const [language, setLanguage] = useState<SiteLanguage>('ru');
   const ready = Boolean(firstOf(value.title).trim());
   const saving = useSiteSave(() =>
      site.save('legal', {
         ...value,
         slug: value.slug || slugOf(value.title.en || value.title.ru, slugs),
      }),
   );
   const submit = async (event: FormEvent) => {
      event.preventDefault();
      if (ready && (await saving.run())) onClose();
   };
   return (
      <form noValidate className={MODAL_FORM} onSubmit={submit}>
         <ModalBody>
            <div className='grid gap-4'>
               <LangTabs
                  filled={filledIn(value.title, value.body)}
                  value={language}
                  onChange={setLanguage}
               />
               <Field label={t('Заголовок')}>
                  <input
                     data-autofocus
                     className='field-input'
                     value={value.title[language]}
                     onChange={(event) =>
                        setValue({
                           ...value,
                           title: {
                              ...value.title,
                              [language]: event.target.value,
                           },
                        })
                     }
                  />
               </Field>
               <Field label={t('Текст страницы')}>
                  <RichTextEditor
                     key={language}
                     label={t('Текст страницы')}
                     value={value.body[language]}
                     onChange={(html) =>
                        setValue((known) => ({
                           ...known,
                           body: { ...known.body, [language]: html },
                        }))
                     }
                  />
               </Field>
            </div>
         </ModalBody>
         <ModalFooter
            note={
               value.slug
                  ? t('Адрес на сайте: /legal/{{slug}}', { slug: value.slug })
                  : t('Адрес на сайте сделается из заголовка')
            }
         >
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
                     : t('Напишите заголовок хотя бы на одном языке')
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

const Legal = ({ pages }: { pages: SiteLegal[] }) => {
   const { t } = useTranslation('site');
   const [editing, setEditing] = useState<SiteLegal | null>(null);
   const [removing, setRemoving] = useState<SiteLegal | null>(null);
   const showing = useSiteSave((id: string, shown: boolean) =>
      site.setShown('legal', id, shown),
   );
   return (
      <div className='grid gap-4'>
         <div className='flex justify-end'>
            <Button
               hint={t('Добавить ещё одну страницу со свободным текстом')}
               onClick={() =>
                  setEditing({
                     id: '',
                     slug: '',
                     published: true,
                     title: emptyLocalized(),
                     body: emptyLocalized(),
                  })
               }
            >
               <Plus aria-hidden />
               {t('Новая страница')}
            </Button>
         </div>
         <Card>
            {pages.length ? (
               <Table
                  head={
                     <>
                        <th className={TH}>{t('Страница')}</th>
                        <th className={TH}>{t('Адрес')}</th>
                        <th className={TH}>{t('Языки')}</th>
                        <th className={TH}>{t('На сайте')}</th>
                        <th className={TH} />
                     </>
                  }
               >
                  {pages.map((page) => (
                     <tr key={page.id}>
                        <td className={TD}>
                           <button
                              type='button'
                              className='text-left font-semibold'
                              data-hint={t('Открыть страницу')}
                              onClick={() => setEditing(page)}
                           >
                              {firstOf(page.title)}
                           </button>
                        </td>
                        <td className={TD}>
                           <OnSite path={`/legal/${page.slug}`}>
                              <code>/legal/{page.slug}</code>
                           </OnSite>
                        </td>
                        <td className={TD}>
                           <LangMarks
                              filled={filledIn(page.title, page.body)}
                           />
                        </td>
                        <td className={TD}>
                           <Switch
                              small
                              checked={page.published}
                              disabled={showing.pending}
                              hint={
                                 page.published
                                    ? t('Снять страницу с сайта')
                                    : t('Опубликовать страницу на сайте')
                              }
                              label={firstOf(page.title)}
                              onChange={(next) =>
                                 void showing.run(page.id, next)
                              }
                           />
                        </td>
                        <td className={TD}>
                           <ItemActions
                              icons
                              name={firstOf(page.title)}
                              onDelete={() => setRemoving(page)}
                              onEdit={() => setEditing(page)}
                           />
                        </td>
                     </tr>
                  ))}
               </Table>
            ) : (
               <NoData />
            )}
         </Card>
         <Modal
            open={editing !== null}
            size='wide'
            title={editing?.id ? t('Страница') : t('Новая страница')}
            onClose={() => setEditing(null)}
         >
            {editing && (
               <LegalDialog
                  page={editing}
                  slugs={pages
                     .filter(({ id }) => id !== editing.id)
                     .map(({ slug }) => slug)}
                  onClose={() => setEditing(null)}
               />
            )}
         </Modal>
         <ConfirmDialog
            open={removing !== null}
            subtitle={removing ? firstOf(removing.title) : undefined}
            success={t('Страница удалена')}
            title={t('Удалить страницу?')}
            onClose={() => setRemoving(null)}
            onConfirm={() => removing && site.remove('legal', removing.id)}
         >
            <p>
               {t(
                  'Ссылки на неё перестанут работать, вернуть её будет нельзя.',
               )}
            </p>
         </ConfirmDialog>
      </div>
   );
};

export default Legal;
