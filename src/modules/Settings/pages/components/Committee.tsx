import settings from '@modules/Settings/services';
import { InlineField, Notice } from '@shared/components';
import { useCurrentUser, useSaveQueue } from '@shared/hooks';
import type { FundRules } from '@shared/types/settings.types';
import { X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import RuleRows from './RuleRows';

interface CommitteeProps {
   rules: FundRules;
   editable: boolean;
   stored: boolean; // ucode has batch 25's fields (the formats)
}

/* The committee's rules: the quorum, the materials and how votes become a
   decision, changed where they stand; the meetings count by them at once.
   Below, the formats a meeting is held in. */
const Committee = ({ rules, editable, stored }: CommitteeProps) => {
   const { t } = useTranslation('settings');
   const user = useCurrentUser();
   const queue = useSaveQueue();
   const [adding, setAdding] = useState(false);
   const formats = rules.meetingFormats;
   const saveFormats = (next: string[]) =>
      settings.saveRules({ meetingFormats: next }, user.id, {
         meetingFormats: t('Форматы заседаний'),
      });

   return (
      <div className='flex flex-col gap-4'>
         <RuleRows
            editable={editable}
            footer={t(
               'Особое мнение члена ИК — вето: вопрос отклоняется. Числа сверяйте с Положением об ИК — оно главнее.',
            )}
            rows={[
               {
                  key: 'icQuorum',
                  label: t('Кворум'),
                  unit: t('членов ИК'),
                  min: 1,
                  max: 20,
               },
               {
                  key: 'icMaterialsDays',
                  label: t('Материалы рассылаются за'),
                  unit: t('рабочих дней'),
                  min: 0,
                  max: 30,
               },
               {
                  key: 'icDiscussionAt',
                  label: t('Голосов «против», после которых решает спонсор'),
                  unit: t('голосов'),
                  min: 1,
                  max: 20,
                  check: (value, current) =>
                     value >= current.icRejectAt
                        ? t('Должно быть меньше, чем голосов для отказа')
                        : undefined,
               },
               {
                  key: 'icRejectAt',
                  label: t('Голосов «против» для отказа'),
                  unit: t('голосов'),
                  min: 1,
                  max: 20,
                  check: (value, current) =>
                     value <= current.icDiscussionAt
                        ? t('Должно быть больше, чем голосов для решения спонсора')
                        : undefined,
               },
            ]}
            rules={rules}
         />
         <section className='border-line rounded-xl border bg-white'>
            <h3 className='border-line border-b px-4.5 py-3 font-semibold'>
               {t('Форматы заседаний')}
            </h3>
            {!stored && (
               <Notice className='m-4.5 mb-0' warning>
                  {t('Форматы можно будет менять, когда в ucode будет партия 25.')}
               </Notice>
            )}
            <ul className='divide-line text-meta max-w-xl divide-y px-4.5 py-1'>
               {formats.map((format, index) => (
                  <li key={format} className='group flex items-center gap-2 py-2'>
                     <InlineField
                        disabled={!editable || !stored}
                        label={t('Формат заседания')}
                        maxLength={60}
                        validate={(text) =>
                           !text
                              ? t('Назовите формат')
                              : formats.some(
                                     (other, at) => at !== index && other === text,
                                  )
                                ? t('Такой формат уже есть')
                                : undefined
                        }
                        value={format}
                        onSave={(text) =>
                           saveFormats(
                              formats.map((item, at) =>
                                 at === index ? text : item,
                              ),
                           )
                        }
                     />
                     {editable && stored && formats.length > 1 && (
                        <button
                           type='button'
                           aria-label={t('Убрать формат «{{name}}»', {
                              name: format,
                           })}
                           className='text-ink-soft hover:text-danger hover:bg-ground grid size-7 shrink-0 place-items-center rounded-md opacity-0 group-focus-within:opacity-100 group-hover:opacity-100'
                           data-hint={t(
                              'Убрать формат: прошлые заседания сохранят свой',
                           )}
                           onClick={() =>
                              queue(() =>
                                 saveFormats(
                                    formats.filter((_, at) => at !== index),
                                 ),
                              )
                           }
                        >
                           <X aria-hidden className='size-4' />
                        </button>
                     )}
                  </li>
               ))}
               {editable && stored && adding && (
                  <li className='py-2'>
                     <InlineField
                        autoFocus
                        label={t('Новый формат')}
                        maxLength={60}
                        placeholder={t('Назовите формат и нажмите Enter')}
                        validate={(text) =>
                           formats.includes(text)
                              ? t('Такой формат уже есть')
                              : undefined
                        }
                        value=''
                        onDone={() => setAdding(false)}
                        onSave={(text) => text && saveFormats([...formats, text])}
                     />
                  </li>
               )}
            </ul>
            {editable && stored && !adding && (
               <button
                  type='button'
                  className='link mx-4.5 mb-3'
                  data-hint={t('Добавить формат заседания')}
                  onClick={() => setAdding(true)}
               >
                  {t('Добавить формат')}
               </button>
            )}
         </section>
      </div>
   );
};

export default Committee;
