import {
   CRITERIA,
   SCORES,
   SCREENING_NOTE_FIELDS,
} from '@modules/Deals/constants';
import { SecondReviewer } from '@modules/Deals/components';
import { applicationText, factRows, isScored } from '@modules/Deals/helpers';
import deals from '@modules/Deals/services';
import {
   Button,
   Card,
   ChoiceCards,
   FactList,
   NoData,
   STACK,
} from '@shared/components';
import type {
   Criterion,
   Deal,
   ScreeningDecision,
   ScreeningNoteKey,
} from '@shared/types/deals.types';
import clsx from 'clsx';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ScreeningProps {
   deal: Deal;
}

interface CriterionRowProps {
   index: number;
   criterion: Criterion;
   locked: boolean;
   onChange: (patch: Partial<Criterion>) => void;
}

const CriterionRow = ({
   index,
   criterion,
   locked,
   onChange,
}: CriterionRowProps) => {
   const { t } = useTranslation('deals');
   const { title, hint } = CRITERIA[index];
   // typed text is kept here and saved when the field is left
   const [rationale, setRationale] = useState(criterion.rationale);
   const [source, setSource] = useState(criterion.source);
   const empty = !rationale.trim();
   const required = t(
      'Обоснование обязательно: факты из заявки, документов или звонка. Без него балл не сохраняется.',
   );

   return (
      <li className='py-5'>
         <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
            <span className='text-ink-soft w-4 text-xs tabular-nums'>
               {index + 1}
            </span>
            <div className='min-w-0 flex-1'>
               <div className='font-semibold'>{t(title)}</div>
               <div className='text-ink-soft mt-0.5 text-xs'>{t(hint)}</div>
            </div>
            <div
               role='radiogroup'
               aria-label={`${t('Балл')}: ${t(title)}`}
               className='flex gap-1.5'
            >
               {SCORES.map((score) => {
                  const chosen = criterion.score === score;
                  return (
                     <button
                        key={score}
                        type='button'
                        role='radio'
                        aria-checked={chosen}
                        className={clsx(
                           'text-meta grid size-8 place-items-center rounded-md border tabular-nums transition-colors disabled:cursor-not-allowed',
                           chosen
                              ? 'border-accent bg-accent font-semibold text-white'
                              : 'border-line-strong text-ink-soft enabled:hover:border-accent bg-white',
                        )}
                        // without the reasons a score is not saved
                        disabled={locked || empty}
                        title={empty ? required : undefined}
                        onClick={() => onChange({ score })}
                     >
                        {score}
                     </button>
                  );
               })}
            </div>
         </div>
         <textarea
            aria-label={`${t('Обоснование')}: ${t(title)}`}
            className={clsx(
               'text-meta placeholder:text-ink-soft field-sizing-content mt-3 block w-full resize-none rounded-lg border px-4 py-3',
               empty
                  ? 'bg-ground border-transparent'
                  : 'border-line-strong bg-white',
            )}
            disabled={locked}
            placeholder={required}
            rows={empty ? 1 : 2}
            value={rationale}
            onBlur={() =>
               rationale !== criterion.rationale &&
               onChange({
                  rationale: rationale.trim(),
                  // a score cannot stand without its reasons
                  score: rationale.trim() ? criterion.score : null,
               })
            }
            onChange={(event) => setRationale(event.target.value)}
         />
         {!empty && (
            <label className='text-ink-soft mt-2 flex items-center gap-2 text-xs'>
               {t('Источник')}:
               <input
                  className='text-accent placeholder:text-ink-faint min-w-0 flex-1 bg-transparent font-medium'
                  disabled={locked}
                  placeholder={t('документ, страница, звонок')}
                  value={source}
                  onBlur={() =>
                     source !== criterion.source &&
                     onChange({ source: source.trim() })
                  }
                  onChange={(event) => setSource(event.target.value)}
               />
            </label>
         )}
      </li>
   );
};

// The screening score: seven criteria, each with its reasons, and the decision.
const Screening = ({ deal }: ScreeningProps) => {
   const { t, i18n } = useTranslation('deals');
   const screening = deal.screening;
   const [editing, setEditing] = useState(false);
   const [note, setNote] = useState(screening?.note);

   if (!screening)
      return (
         <Card className='grid flex-1 place-items-center'>
            <NoData>
               {deal.status === 'review'
                  ? t('Оценка начнётся, когда заявку возьмут в скрининг')
                  : t('Оценки по критериям для этой сделки в примере нет')}
            </NoData>
         </Card>
      );

   // only a deal that is being screened can be scored
   const locked = deal.status !== 'active' || deal.stage !== 'screening';
   const scored = screening.criteria.filter(isScored);
   const average = scored.length
      ? scored.reduce((sum, { score }) => sum + (score ?? 0), 0) / scored.length
      : 0;
   const averageText = new Intl.NumberFormat(
      i18n.resolvedLanguage ?? i18n.language,
      { minimumFractionDigits: 2, maximumFractionDigits: 2 },
   ).format(average);
   const complete = scored.length === CRITERIA.length;

   const saveNote = async () => {
      if (note) await deals.setScreeningNote(deal.id, note);
      setEditing(false);
   };

   return (
      <div className='gap-section grid flex-1 xl:grid-cols-[minmax(0,1fr)_23.75rem]'>
         <Card
            className='overflow-hidden'
            hint={t('заполнено {{done}} из {{total}}', {
               done: scored.length,
               total: CRITERIA.length,
            })}
            title={t('Оценка по {{total}} критериям', {
               total: CRITERIA.length,
            })}
         >
            <ol className='divide-line divide-y px-5'>
               {screening.criteria.map((criterion, index) => (
                  <CriterionRow
                     key={criterion.key}
                     criterion={criterion}
                     index={index}
                     locked={locked}
                     onChange={(patch) =>
                        deals.setCriterion(deal.id, criterion.key, patch)
                     }
                  />
               ))}
            </ol>
            <div className='bg-ground flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-4'>
               <div className='min-w-0 flex-1'>
                  <div className='font-semibold'>
                     {complete
                        ? t('Итоговая оценка {{score}}', { score: averageText })
                        : scored.length
                          ? t('Средний балл {{score}} по {{count}} критерию', {
                               score: averageText,
                               count: scored.length,
                            })
                          : t('Оценок пока нет')}
                  </div>
                  <div className='text-ink-soft mt-1 max-w-2xl text-xs'>
                     {t(
                        'Итоговая оценка появится, когда заполнены все 7 обоснований. Балл не решает за ИК — он нужен, чтобы сравнивать сделки между собой.',
                     )}
                  </div>
               </div>
               {screening.savedAt && (
                  <span className='text-ink-soft text-xs'>
                     {t('Черновик сохранён {{time}}', {
                        time: screening.savedAt,
                     })}
                  </span>
               )}
            </div>
         </Card>

         <div className={STACK}>
            <Card title={t('Решение по скринингу')}>
               <div className='p-5'>
                  <ChoiceCards<ScreeningDecision>
                     disabled={locked}
                     label={t('Решение по скринингу')}
                     name='screening-decision'
                     options={[
                        {
                           value: 'meeting',
                           label: t('Пригласить на встречу'),
                           note: t(
                              'Переход в стадию «Встреча», заявитель видит дату и участников',
                           ),
                        },
                        {
                           value: 'request',
                           label: t('Запросить данные'),
                           note: t('Часы скрининга останавливаются до ответа'),
                        },
                        {
                           value: 'reject',
                           label: t('Отказать с причиной'),
                           note: t(
                              'Причина из справочника, дата повторной подачи',
                           ),
                        },
                     ]}
                     value={screening.decision}
                     onChange={(decision) =>
                        deals.setScreening(deal.id, { decision })
                     }
                  />
                  <div className='text-meta mt-3 flex items-center gap-3'>
                     <span className='text-ink-soft'>
                        {t('Второй оценщик')}:
                     </span>
                     <SecondReviewer deal={deal} disabled={locked} />
                  </div>
                  <p className='text-ink-soft mt-3 text-xs'>
                     {t(
                        'Правило фонда: решение по скринингу подтверждает второй сотрудник. Кнопка «Завершить скрининг» станет активной после 7 обоснований.',
                     )}
                  </p>
               </div>
            </Card>

            <Card
               action={
                  !locked &&
                  !editing && (
                     <button
                        type='button'
                        className='link'
                        onClick={() => {
                           setNote(screening.note);
                           setEditing(true);
                        }}
                     >
                        {t('Редактировать')}
                     </button>
                  )
               }
               title={t('Скрининг-заметка')}
            >
               <dl className='divide-line text-meta divide-y px-5 py-1'>
                  {SCREENING_NOTE_FIELDS.map(({ key, label }) => (
                     <div key={key} className='py-3'>
                        <dt className='text-ink-soft text-xs'>{t(label)}</dt>
                        <dd className='mt-1'>
                           {editing && note ? (
                              <textarea
                                 aria-label={t(label)}
                                 className='field-input text-meta'
                                 rows={2}
                                 value={note[key]}
                                 onChange={(event) =>
                                    setNote({
                                       ...note,
                                       [key as ScreeningNoteKey]:
                                          event.target.value,
                                    })
                                 }
                              />
                           ) : (
                              screening.note[key] || '—'
                           )}
                        </dd>
                     </div>
                  ))}
               </dl>
               {editing && (
                  <div className='flex justify-end gap-2.5 px-5 pb-4'>
                     <Button variant='text' onClick={() => setEditing(false)}>
                        {t('Отмена')}
                     </Button>
                     <Button onClick={saveNote}>{t('Сохранить')}</Button>
                  </div>
               )}
            </Card>

            {deal.facts && (
               <Card
                  hint={deal.factsHint && applicationText(t, deal.factsHint)}
                  title={t('Из заявки')}
               >
                  <div className='text-meta px-5 py-3'>
                     <FactList
                        labelWidth='6.5rem'
                        rows={factRows(t, deal.facts)}
                     />
                  </div>
               </Card>
            )}
         </div>
      </div>
   );
};

export default Screening;
