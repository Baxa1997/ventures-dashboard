import { QUESTION_KIND_LABELS } from '@modules/Settings/constants';
import settings, { namesIn } from '@modules/Settings/services';
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
   Notice,
} from '@shared/components';
import { toLatin } from '@shared/helpers';
import { useAction, useCurrentUser } from '@shared/hooks';
import type {
   QuestionField,
   QuestionKind,
   QuestionSection,
} from '@shared/types/settings.types';
import type { SupportedLanguageType } from '@shared/types/system/language.types';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

type Names = Record<SupportedLanguageType, string>;

const LANGUAGES = [
   ['ru', 'Название (рус.)'],
   ['uz', 'Название (узб.)'],
   ['en', 'Название (англ.)'],
] as const satisfies readonly (readonly [SupportedLanguageType, string])[];

const KINDS = Object.keys(QUESTION_KIND_LABELS) as QuestionKind[];

const ARROW =
   'text-ink-soft hover:bg-ground grid size-7 place-items-center rounded-md disabled:opacity-35';

// A key from a name, not used yet: answers are kept by it, so it never changes.
const newKey = (name: string, taken: string[]) => {
   const base =
      toLatin(name.trim())
         .replace(/[^a-z0-9]+/g, '_')
         .replace(/^_+|_+$/g, '') || 'question';
   let key = base;
   for (let index = 2; taken.includes(key); index += 1)
      key = `${base}_${index}`;
   return key;
};

const moved = <T,>(list: T[], from: number, to: number) => {
   const next = [...list];
   next.splice(to, 0, ...next.splice(from, 1));
   return next;
};

// "Меньше 3 месяцев / 3 oydan kam / Less than 3 months", a line each.
const optionsText = (options: Names[] = []) =>
   options.map(({ ru, uz, en }) => [ru, uz, en].join(' / ')).join('\n');

const optionsFrom = (text: string): Names[] =>
   text
      .split('\n')
      .map((line) => line.split('/').map((part) => part.trim()))
      .filter(([ru]) => ru)
      .map(([ru, uz, en]) => ({ ru, uz: uz || ru, en: en || ru }));

interface NamesFieldsProps {
   value: Names;
   onChange: (value: Names) => void;
}

const NamesFields = ({ value, onChange }: NamesFieldsProps) => {
   const { t } = useTranslation('settings');
   return LANGUAGES.map(([language, label], index) => (
      <Field key={language} label={t(label)}>
         <input
            {...(index === 0 && { 'data-autofocus': true })}
            className='field-input'
            maxLength={160}
            value={value[language]}
            onChange={(event) =>
               onChange({ ...value, [language]: event.target.value })
            }
         />
      </Field>
   ));
};

interface SectionFormProps {
   section: QuestionSection | null; // null: a new section
   pending: boolean;
   onSave: (title: Names) => void;
   onClose: () => void;
}

const SectionForm = ({
   section,
   pending,
   onSave,
   onClose,
}: SectionFormProps) => {
   const { t } = useTranslation('settings');
   const [title, setTitle] = useState<Names>(
      section?.title ?? { ru: '', uz: '', en: '' },
   );

   const submit = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (title.ru.trim()) onSave(title);
   };

   return (
      <form noValidate className={MODAL_FORM} onSubmit={submit}>
         <ModalBody>
            <div className='grid gap-4'>
               <NamesFields value={title} onChange={setTitle} />
            </div>
         </ModalBody>
         <ModalFooter>
            <Button disabled={pending} variant='text' onClick={onClose}>
               {t('Отмена')}
            </Button>
            <Button disabled={!title.ru.trim()} loading={pending} type='submit'>
               {t('Сохранить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

interface QuestionFormProps {
   question: QuestionField | null; // null: a new question
   pending: boolean;
   onSave: (question: Omit<QuestionField, 'id'>) => void;
   onClose: () => void;
}

// A question's wording and its kind; a kind stays as made, since answers keep it.
const QuestionForm = ({
   question,
   pending,
   onSave,
   onClose,
}: QuestionFormProps) => {
   const { t } = useTranslation('settings');
   const [label, setLabel] = useState<Names>(
      question?.label ?? { ru: '', uz: '', en: '' },
   );
   const [kind, setKind] = useState<QuestionKind>(question?.kind ?? 'area');
   const [options, setOptions] = useState(optionsText(question?.options));
   const choices = optionsFrom(options);
   const valid = label.ru.trim() && (kind !== 'select' || choices.length > 0);

   const submit = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (valid)
         onSave({
            label,
            kind,
            ...(kind === 'select' && { options: choices }),
         });
   };

   return (
      <form noValidate className={MODAL_FORM} onSubmit={submit}>
         <ModalBody>
            <div className='grid gap-4'>
               <NamesFields value={label} onChange={setLabel} />
               <Field
                  hint={
                     question
                        ? t('Тип не меняется: ответы хранят его')
                        : undefined
                  }
                  label={t('Тип ответа')}
               >
                  <select
                     className='field-input'
                     disabled={!!question}
                     value={kind}
                     onChange={(event) =>
                        setKind(event.target.value as QuestionKind)
                     }
                  >
                     {KINDS.map((item) => (
                        <option key={item} value={item}>
                           {t(QUESTION_KIND_LABELS[item])}
                        </option>
                     ))}
                  </select>
               </Field>
               {kind === 'select' && (
                  <Field
                     hint={t(
                        'Каждый вариант с новой строки: рус. / узб. / англ.',
                     )}
                     label={t('Варианты')}
                  >
                     <textarea
                        className='field-input text-meta field-sizing-content min-h-24 resize-none'
                        value={options}
                        onChange={(event) => setOptions(event.target.value)}
                     />
                  </Field>
               )}
            </div>
         </ModalBody>
         <ModalFooter>
            <Button disabled={pending} variant='text' onClick={onClose}>
               {t('Отмена')}
            </Button>
            <Button disabled={!valid} loading={pending} type='submit'>
               {t('Сохранить')}
            </Button>
         </ModalFooter>
      </form>
   );
};

interface QuestionnaireProps {
   sections: QuestionSection[];
   editable: boolean;
   stored: boolean; // ucode has the field to keep it in (batch 17)
}

type Removing =
   | { kind: 'section'; section: QuestionSection }
   | { kind: 'question'; section: QuestionSection; field: QuestionField };

/* «Анкета основателя»: the questionnaire of every deal, by section. Its
   questions are added, reworded, ordered and deleted here, and each change
   is saved at once and goes to the journal; the startup cabinet and the
   deal's card read the same list. */
const Questionnaire = ({ sections, editable, stored }: QuestionnaireProps) => {
   const { t } = useTranslation('settings');
   const user = useCurrentUser();
   // null: closed; 'new': a section added
   const [editingSection, setEditingSection] = useState<
      QuestionSection | 'new' | null
   >(null);
   // the section a question is added to or changed in; field null: a new one
   const [editingQuestion, setEditingQuestion] = useState<{
      section: QuestionSection;
      field: QuestionField | null;
   } | null>(null);
   const [removing, setRemoving] = useState<Removing | null>(null);

   const saving = useAction(
      (next: QuestionSection[], what: string, from: string, to: string) =>
         settings.saveQuestionnaire(next, user.id, {
            field: t('Анкета основателя · {{name}}', { name: what }),
            from,
            to,
         }),
      { success: t('Сохранено') },
   );

   const replaced = (section: QuestionSection, fields: QuestionField[]) =>
      sections.map((item) =>
         item.id === section.id ? { ...item, fields } : item,
      );

   const saveSection = async (title: Names) => {
      if (editingSection === null) return;
      const next =
         editingSection === 'new'
            ? [
                 ...sections,
                 {
                    id: newKey(
                       title.en || title.ru,
                       sections.map(({ id }) => id),
                    ),
                    title,
                    fields: [],
                 },
              ]
            : sections.map((item) =>
                 item.id === editingSection.id ? { ...item, title } : item,
              );
      const from = editingSection === 'new' ? '' : editingSection.title.ru;
      if (await saving.run(next, title.ru, from, title.ru))
         setEditingSection(null);
   };

   const saveQuestion = async (question: Omit<QuestionField, 'id'>) => {
      if (!editingQuestion) return;
      const { section, field } = editingQuestion;
      const fields = field
         ? section.fields.map((item) =>
              item.id === field.id ? { ...question, id: field.id } : item,
           )
         : [
              ...section.fields,
              {
                 ...question,
                 id: newKey(
                    question.label.en || question.label.ru,
                    sections.flatMap((item) =>
                       item.fields.map(({ id }) => id),
                    ),
                 ),
              },
           ];
      if (
         await saving.run(
            replaced(section, fields),
            section.title.ru,
            field?.label.ru ?? '',
            question.label.ru,
         )
      )
         setEditingQuestion(null);
   };

   const moveSection = (from: number, to: number) =>
      saving.run(
         moved(sections, from, to),
         sections[from].title.ru,
         String(from + 1),
         String(to + 1),
      );

   const moveQuestion = (
      section: QuestionSection,
      from: number,
      to: number,
   ) =>
      saving.run(
         replaced(section, moved(section.fields, from, to)),
         section.fields[from].label.ru,
         String(from + 1),
         String(to + 1),
      );

   const remove = () => {
      if (!removing) return undefined;
      return removing.kind === 'section'
         ? settings.saveQuestionnaire(
              sections.filter(({ id }) => id !== removing.section.id),
              user.id,
              {
                 field: t('Анкета основателя · удалён раздел'),
                 from: removing.section.title.ru,
                 to: '',
              },
           )
         : settings.saveQuestionnaire(
              replaced(
                 removing.section,
                 removing.section.fields.filter(
                    ({ id }) => id !== removing.field.id,
                 ),
              ),
              user.id,
              {
                 field: t('Анкета основателя · удалён вопрос'),
                 from: removing.field.label.ru,
                 to: '',
              },
           );
   };

   return (
      <>
         {!stored && (
            <Notice warning className='mb-4'>
               {t(
                  'Это встроенная анкета: менять её здесь можно будет, когда в ucode появится партия 17.',
               )}
            </Notice>
         )}
         <div className='gap-section grid'>
            {sections.map((section, sectionIndex) => (
               <Card
                  key={section.id}
                  action={
                     editable && (
                        <span className='flex items-center gap-0.5'>
                           <button
                              type='button'
                              aria-label={t('Выше: {{name}}', {
                                 name: section.title.ru,
                              })}
                              className={ARROW}
                              disabled={!sectionIndex || saving.pending}
                              onClick={() =>
                                 moveSection(sectionIndex, sectionIndex - 1)
                              }
                           >
                              <ChevronUp aria-hidden className='size-4' />
                           </button>
                           <button
                              type='button'
                              aria-label={t('Ниже: {{name}}', {
                                 name: section.title.ru,
                              })}
                              className={ARROW}
                              disabled={
                                 sectionIndex === sections.length - 1 ||
                                 saving.pending
                              }
                              onClick={() =>
                                 moveSection(sectionIndex, sectionIndex + 1)
                              }
                           >
                              <ChevronDown aria-hidden className='size-4' />
                           </button>
                           <ItemActions
                              icons
                              name={section.title.ru}
                              onDelete={() =>
                                 setRemoving({ kind: 'section', section })
                              }
                              onEdit={() => setEditingSection(section)}
                           />
                        </span>
                     )
                  }
                  title={namesIn(section.title)}
               >
                  <ul className='divide-line divide-y'>
                     {section.fields.map((field, index) => (
                        <li
                           key={field.id}
                           className='grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4.5 py-2.5'
                        >
                           <div className='min-w-0'>
                              <div className='text-meta font-medium'>
                                 {namesIn(field.label)}
                              </div>
                              <div className='text-ink-soft text-xs'>
                                 {t(QUESTION_KIND_LABELS[field.kind])}
                                 {field.options &&
                                    `: ${field.options
                                       .map((option) => namesIn(option))
                                       .join(', ')}`}
                              </div>
                           </div>
                           {editable && (
                              <span className='flex items-center gap-0.5'>
                                 <button
                                    type='button'
                                    aria-label={t('Выше: {{name}}', {
                                       name: field.label.ru,
                                    })}
                                    className={ARROW}
                                    disabled={!index || saving.pending}
                                    onClick={() =>
                                       moveQuestion(section, index, index - 1)
                                    }
                                 >
                                    <ChevronUp
                                       aria-hidden
                                       className='size-4'
                                    />
                                 </button>
                                 <button
                                    type='button'
                                    aria-label={t('Ниже: {{name}}', {
                                       name: field.label.ru,
                                    })}
                                    className={ARROW}
                                    disabled={
                                       index === section.fields.length - 1 ||
                                       saving.pending
                                    }
                                    onClick={() =>
                                       moveQuestion(section, index, index + 1)
                                    }
                                 >
                                    <ChevronDown
                                       aria-hidden
                                       className='size-4'
                                    />
                                 </button>
                                 <ItemActions
                                    icons
                                    name={field.label.ru}
                                    onDelete={() =>
                                       setRemoving({
                                          kind: 'question',
                                          section,
                                          field,
                                       })
                                    }
                                    onEdit={() =>
                                       setEditingQuestion({ section, field })
                                    }
                                 />
                              </span>
                           )}
                        </li>
                     ))}
                  </ul>
                  {editable && (
                     <div className='border-line border-t px-4.5 py-2.5'>
                        <button
                           type='button'
                           className='link text-meta flex items-center gap-1.5'
                           onClick={() =>
                              setEditingQuestion({ section, field: null })
                           }
                        >
                           <Plus aria-hidden className='size-4' />
                           {t('Добавить вопрос')}
                        </button>
                     </div>
                  )}
               </Card>
            ))}
            {editable && (
               <div>
                  <Button
                     variant='ghost'
                     onClick={() => setEditingSection('new')}
                  >
                     <Plus aria-hidden />
                     {t('Добавить раздел')}
                  </Button>
               </div>
            )}
         </div>
         <Notice className='mt-4'>
            {t(
               'Анкета одна для всех сделок. Основатель заполняет её в кабинете по запросу фонда, а фонд видит и дополняет ответы в сделке, на вкладке «Скрининг и оценка». Изменённый вопрос сразу виден и там, и там.',
            )}
         </Notice>
         <Modal
            open={editingSection !== null}
            title={
               editingSection === 'new'
                  ? t('Новый раздел анкеты')
                  : t('Раздел анкеты')
            }
            onClose={() => setEditingSection(null)}
         >
            {editingSection !== null && (
               <SectionForm
                  pending={saving.pending}
                  section={editingSection === 'new' ? null : editingSection}
                  onClose={() => setEditingSection(null)}
                  onSave={saveSection}
               />
            )}
         </Modal>
         <Modal
            open={editingQuestion !== null}
            subtitle={editingQuestion && namesIn(editingQuestion.section.title)}
            title={editingQuestion?.field ? t('Вопрос') : t('Новый вопрос')}
            onClose={() => setEditingQuestion(null)}
         >
            {editingQuestion && (
               <QuestionForm
                  pending={saving.pending}
                  question={editingQuestion.field}
                  onClose={() => setEditingQuestion(null)}
                  onSave={saveQuestion}
               />
            )}
         </Modal>
         <ConfirmDialog
            open={removing !== null}
            subtitle={
               removing?.kind === 'question'
                  ? removing.field.label.ru
                  : removing?.section.title.ru
            }
            title={
               removing?.kind === 'section'
                  ? t('Удалить раздел анкеты?')
                  : t('Удалить вопрос?')
            }
            onClose={() => setRemoving(null)}
            onConfirm={remove}
         >
            <p>
               {removing?.kind === 'section'
                  ? t(
                       'Раздел с его вопросами исчезнет из анкеты у всех сделок и в кабинете основателя; ответы на них больше не будут показаны.',
                    )
                  : t(
                       'Вопрос исчезнет из анкеты у всех сделок и в кабинете основателя; ответы на него больше не будут показаны.',
                    )}
            </p>
         </ConfirmDialog>
      </>
   );
};

export default Questionnaire;
