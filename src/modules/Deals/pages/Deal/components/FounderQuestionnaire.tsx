import { CapitalBar, CapitalDialog } from '@modules/Deals/components';
import { answeredSections, isOpen } from '@modules/Deals/helpers';
import deals from '@modules/Deals/services';
import { namesIn, questionnaireOf } from '@modules/Settings/services';
import { Card, NoData } from '@shared/components';
import { formatDate, personName } from '@shared/helpers';
import { useAction, useCurrentUser } from '@shared/hooks';
import type { Deal } from '@shared/types/deals.types';
import type { QuestionField } from '@shared/types/settings.types';
import clsx from 'clsx';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface AnswerInputProps {
   field: QuestionField;
   value: string;
   disabled: boolean;
   onSave: (value: string) => void;
}

// A question's answer, drawn by its kind: typed text is saved when the field
// is left, a choice at once; a yes or no pressed again is taken back.
const AnswerInput = ({ field, value, disabled, onSave }: AnswerInputProps) => {
   const { t } = useTranslation('deals');
   const [draft, setDraft] = useState<string | null>(null);
   const label = namesIn(field.label);
   const leave = () => {
      if (draft !== null && draft.trim() !== value) onSave(draft.trim());
      setDraft(null);
   };

   if (field.kind === 'yesno')
      return (
         <div
            role='radiogroup'
            aria-label={label}
            className='border-line inline-flex gap-0.5 rounded-lg border p-0.5'
         >
            {(['yes', 'no'] as const).map((option) => (
               <button
                  key={option}
                  type='button'
                  role='radio'
                  aria-checked={value === option}
                  className={clsx(
                     'text-meta rounded-md px-3 py-1 font-semibold',
                     value === option
                        ? 'bg-accent-tint text-ink-strong'
                        : 'text-ink-soft enabled:hover:bg-hover',
                  )}
                  disabled={disabled}
                  onClick={() => onSave(value === option ? '' : option)}
               >
                  {option === 'yes' ? t('Да') : t('Нет')}
               </button>
            ))}
         </div>
      );

   if (field.kind === 'select')
      return (
         <select
            aria-label={label}
            className='field-input max-w-65'
            disabled={disabled}
            value={value}
            onChange={(event) => onSave(event.target.value)}
         >
            <option value=''>{t('Не выбрано')}</option>
            {field.options?.map((option) => (
               <option key={option.ru} value={option.ru}>
                  {namesIn(option)}
               </option>
            ))}
         </select>
      );

   if (field.kind === 'area')
      return (
         <textarea
            aria-label={label}
            className='field-input text-meta field-sizing-content min-h-16 resize-none'
            disabled={disabled}
            maxLength={600}
            placeholder={t('Нет ответа')}
            value={draft ?? value}
            onBlur={leave}
            onChange={(event) => setDraft(event.target.value)}
         />
      );

   if (field.kind === 'number')
      return (
         <input
            aria-label={label}
            className='field-input max-w-55 tabular-nums'
            disabled={disabled}
            inputMode='decimal'
            maxLength={20}
            placeholder='0'
            value={draft ?? value}
            onBlur={leave}
            onChange={(event) =>
               setDraft(event.target.value.replace(/[^\d\s.,]/g, ''))
            }
         />
      );

   return (
      <div className='flex items-center gap-1.5'>
         <input
            aria-label={label}
            className='field-input'
            disabled={disabled}
            maxLength={300}
            placeholder={t('Нет ответа')}
            value={draft ?? value}
            onBlur={leave}
            onChange={(event) => setDraft(event.target.value)}
         />
         {/^https?:\/\//i.test(value) && (
            <a
               aria-label={t('Открыть ссылку')}
               className='text-ink-soft hover:bg-hover grid size-8 shrink-0 place-items-center rounded-md'
               href={value}
               rel='noreferrer'
               target='_blank'
            >
               <ExternalLink aria-hidden className='size-4' />
            </a>
         )}
      </div>
   );
};

interface FounderQuestionnaireProps {
   deal: Deal;
   onQuestionnaire: () => void; // asks the founder to fill it in the cabinet
}

/* «Анкета основателя», as the design draws it: the questions of Настройки by
   section, each with how many are answered, and the fund's answers typed in
   place. It is one row with the startup cabinet: what the fund writes the
   founder sees, and the founder goes on from it once «Запросить анкету» has
   opened it there. The first section also has the capital's table, the same
   as on the deal's Обзор. */
const FounderQuestionnaire = ({
   deal,
   onQuestionnaire,
}: FounderQuestionnaireProps) => {
   const { t } = useTranslation('deals');
   const user = useCurrentUser();
   const sections = questionnaireOf();
   const answers = deal.questionnaire?.values ?? {};
   const editable = isOpen(deal);
   const [capital, setCapital] = useState(false);
   const asked = (deal.requests ?? []).some(
      ({ ddQuestionnaire, status }) => ddQuestionnaire && status === 'waiting',
   );
   const saving = useAction(
      (id: string, value: string) =>
         deals.setAnswer(deal.id, id, value, user.id),
      { success: t('Ответ сохранён') },
   );
   const { updatedAt, updatedById, submittedAt } = deal.questionnaire ?? {
      updatedAt: '',
      updatedById: '',
      submittedAt: '',
   };

   return (
      <Card
         action={
            editable &&
            !asked && (
               <button type='button' className='link' onClick={onQuestionnaire}>
                  {t('Запросить анкету')}
               </button>
            )
         }
         hint={t('заполнено разделов: {{done}} из {{total}}', {
            done: answeredSections(deal),
            total: sections.length,
         })}
         title={t('Анкета основателя')}
      >
         {sections.length ? (
            <div className='divide-line divide-y'>
               {sections.map((section, index) => {
                  const filled = section.fields.filter(({ id }) =>
                     (answers[id] ?? '').trim(),
                  );
                  return (
                     <details
                        key={section.id}
                        className='group'
                        open={index === 0}
                     >
                        <summary className='hover:bg-hover flex cursor-pointer list-none items-center justify-between gap-3 px-4.5 py-3 font-semibold [&::-webkit-details-marker]:hidden'>
                           <span className='flex min-w-0 items-center gap-2'>
                              <ChevronRight
                                 aria-hidden
                                 className='text-ink-faint size-4 shrink-0 transition-transform group-open:rotate-90'
                              />
                              {namesIn(section.title)}
                           </span>
                           <span className='text-ink-soft text-xs font-normal tabular-nums'>
                              {filled.length} / {section.fields.length}
                           </span>
                        </summary>
                        <table className='text-meta w-full border-collapse'>
                           <tbody>
                              {section.fields.map((field) => (
                                 <tr
                                    key={field.id}
                                    className='border-line border-t'
                                 >
                                    <th
                                       className='text-ink-soft w-[34%] px-4.5 py-2.5 text-left align-top font-medium'
                                       scope='row'
                                    >
                                       {namesIn(field.label)}
                                    </th>
                                    <td className='px-4.5 py-2 align-top'>
                                       <AnswerInput
                                          disabled={!editable}
                                          field={field}
                                          value={answers[field.id] ?? ''}
                                          onSave={(value) =>
                                             saving.run(field.id, value)
                                          }
                                       />
                                    </td>
                                 </tr>
                              ))}
                              {index === 0 && (
                                 <tr className='border-line border-t'>
                                    <th
                                       className='text-ink-soft w-[34%] px-4.5 py-2.5 text-left align-top font-medium'
                                       scope='row'
                                    >
                                       {t('Доли участников')}
                                       <div className='text-xs font-normal'>
                                          {t(
                                             'та же таблица, что в карточке сделки',
                                          )}
                                       </div>
                                    </th>
                                    <td className='px-4.5 py-2.5 align-top'>
                                       {deal.owners.length > 0 && (
                                          <CapitalBar owners={deal.owners} />
                                       )}
                                       {editable && (
                                          <button
                                             type='button'
                                             className={clsx(
                                                'link',
                                                deal.owners.length > 0 &&
                                                   'mt-2',
                                             )}
                                             onClick={() => setCapital(true)}
                                          >
                                             {deal.owners.length
                                                ? t('Изменить')
                                                : t('Внести доли')}
                                          </button>
                                       )}
                                    </td>
                                 </tr>
                              )}
                           </tbody>
                        </table>
                     </details>
                  );
               })}
            </div>
         ) : (
            <NoData>{t('Вопросов пока нет: их задают в Настройках.')}</NoData>
         )}
         <footer className='border-line text-ink-soft flex flex-wrap justify-between gap-x-4 gap-y-1 border-t px-4.5 py-2.5 text-xs'>
            <span>
               {submittedAt
                  ? t('Основатель отправил анкету {{date}}.', {
                       date: formatDate(submittedAt.slice(0, 10)),
                    })
                  : asked
                    ? t(
                         'Анкета запрошена: основатель заполняет её в кабинете, ответы видны по мере сохранения.',
                      )
                    : t(
                         'Ответы сохраняются сразу и видны основателю в кабинете',
                      )}
            </span>
            <span>
               {t('Последнее изменение: {{who}}', {
                  who: updatedAt
                     ? `${personName(updatedById) || t('основатель')}, ${formatDate(updatedAt.slice(0, 10))}`
                     : '—',
               })}
            </span>
         </footer>
         <CapitalDialog
            deal={deal}
            open={capital}
            onClose={() => setCapital(false)}
         />
      </Card>
   );
};

export default FounderQuestionnaire;
