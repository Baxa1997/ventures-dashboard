import {
   CRITERIA,
   SCORES,
   SCREENING_NOTE_FIELDS,
} from '@modules/Deals/constants';
import { SecondReviewer } from '@modules/Deals/components';
import {
   applicationText,
   factRows,
   isOpen,
   isScored,
} from '@modules/Deals/helpers';
import deals from '@modules/Deals/services';
import {
   Attachments,
   Button,
   Card,
   ChoiceCards,
   FactList,
   NoData,
   Spinner,
   STACK,
} from '@shared/components';
import { useAction, useRequest } from '@shared/hooks';
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
   dealId: string;
   index: number;
   criterion: Criterion;
   locked: boolean; // the score: only while the deal is being screened
   attachable: boolean; // the links and files: while the deal is open
   onChange: (patch: Partial<Criterion>) => Promise<unknown>;
}

const CriterionRow = ({
   dealId,
   index,
   criterion,
   locked,
   attachable,
   onChange,
}: CriterionRowProps) => {
   const { t } = useTranslation('deals');
   const { title, hint } = CRITERIA[index];
   // typed text is kept here and saved when the field is left
   const [rationale, setRationale] = useState(criterion.rationale);
   const [source, setSource] = useState(criterion.source);
   const empty = !rationale.trim();
   const saving = useAction(onChange, {
      success: (patch) =>
         'score' in patch
            ? t('Балл сохранён')
            : 'rationale' in patch
              ? t('Обоснование сохранено')
              : t('Источник сохранён'),
   });
   // the score being saved, for its spinner
   const [scoring, setScoring] = useState<number | null>(null);

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
                        disabled={locked || saving.pending}
                        onClick={async () => {
                           setScoring(score);
                           await saving.run({ score });
                           setScoring(null);
                        }}
                     >
                        {scoring === score ? <Spinner /> : score}
                     </button>
                  );
               })}
            </div>
         </div>
         <textarea
            aria-label={`${t('Обоснование')}: ${t(title)}`}
            aria-invalid={criterion.score !== null && empty}
            className='field-input text-meta field-sizing-content mt-3 min-h-11 resize-none py-2.5 disabled:bg-ground'
            disabled={locked}
            placeholder={t(
               'Обоснование: факты из заявки, документов или звонка',
            )}
            rows={2}
            value={rationale}
            onBlur={() =>
               rationale !== criterion.rationale &&
               saving.run({ rationale: rationale.trim() })
            }
            onChange={(event) => setRationale(event.target.value)}
         />
         {/* a score counts only with its reasons (isScored) */}
         {criterion.score !== null && empty && (
            <p className='text-danger mt-1.5 text-xs'>
               {t('Напишите обоснование — без него балл не засчитывается')}
            </p>
         )}
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
                     saving.run({ source: source.trim() })
                  }
                  onChange={(event) => setSource(event.target.value)}
               />
            </label>
         )}
         {/* the score's evidence: links and files, as many as needed */}
         <Attachments
            className='mt-2'
            editable={attachable}
            place={{ dealId, section: 'screening', itemId: criterion.key }}
         />
      </li>
   );
};

// The screening score: seven criteria, each with its reasons, and the decision.
const Screening = ({ deal }: ScreeningProps) => {
   const { t, i18n } = useTranslation('deals');
   const screening = deal.screening;
   const [editing, setEditing] = useState(false);
   const [note, setNote] = useState(screening?.note);
   const deciding = useAction(
      (decision: ScreeningDecision) =>
         deals.setScreening(deal.id, { decision }),
      { success: t('Решение сохранено') },
   );
   const noting = useRequest();

   // the screening's materials, added whenever the deal is open
   const materials = (
      <Card title={t('Материалы скрининга')}>
         <div className='px-5 py-4'>
            <Attachments
               editable={isOpen(deal)}
               empty={t(
                  'Ссылки и файлы скрининга: презентация, финмодель, заметки со звонка.',
               )}
               place={{ dealId: deal.id, section: 'screening' }}
            />
         </div>
      </Card>
   );

   if (!screening)
      return (
         <div className='gap-section grid flex-1 content-start xl:grid-cols-[minmax(0,1fr)_23.75rem]'>
            <Card className='grid min-h-40 place-items-center'>
               <NoData>
                  {deal.status === 'review'
                     ? t('Оценка начнётся, когда заявку возьмут в скрининг')
                     : t('Оценки по критериям для этой сделки нет')}
               </NoData>
            </Card>
            {materials}
         </div>
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
      if (
         !note ||
         (await noting.run(() => deals.setScreeningNote(deal.id, note)))
      )
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
                     dealId={deal.id}
                     index={index}
                     attachable={isOpen(deal)}
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
                     disabled={locked || deciding.pending}
                     label={t('Решение по скринингу')}
                     name='screening-decision'
                     options={[
                        {
                           value: 'meeting',
                           label: t('Пригласить на встречу'),
                           note: t('Переход в стадию «Встреча»'),
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
                     onChange={(decision) => deciding.run(decision)}
                  />
                  <div className='text-meta mt-3 flex items-center gap-3'>
                     <span className='text-ink-soft'>
                        {t('Второй оценщик')}:
                     </span>
                     <SecondReviewer deal={deal} disabled={locked} />
                  </div>
                  <p className='text-ink-soft mt-3 text-xs'>
                     {t(
                        'Правило фонда: оценку проверяет второй сотрудник. «Завершить скрининг» включится, когда у всех 7 критериев есть балл и обоснование и выбран второй оценщик.',
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
                     <Button
                        disabled={noting.pending}
                        variant='text'
                        onClick={() => setEditing(false)}
                     >
                        {t('Отмена')}
                     </Button>
                     <Button loading={noting.pending} onClick={saveNote}>
                        {t('Сохранить')}
                     </Button>
                  </div>
               )}
            </Card>

            {materials}

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
