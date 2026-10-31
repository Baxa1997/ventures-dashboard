import { SecondReviewer } from '@modules/Deals/components';
import { SCORE_THRESHOLD, SCORES } from '@modules/Deals/constants';
import {
   applicationText,
   emptyScreening,
   factRows,
   isOpen,
   isScored,
   scoreRows,
   weightedScore,
} from '@modules/Deals/helpers';
import deals from '@modules/Deals/services';
import { hintOf, nameOf } from '@modules/Settings/services';
import {
   Attachments,
   Button,
   Card,
   FactList,
   Field,
   Notice,
   Spinner,
   STACK,
} from '@shared/components';
import { useAction, useRequest } from '@shared/hooks';
import type {
   Criterion,
   Deal,
   Screening as ScreeningData,
   ScreeningDecision,
} from '@shared/types/deals.types';
import type { ListItem } from '@shared/types/settings.types';
import clsx from 'clsx';
import { TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import FounderQuestionnaire from './FounderQuestionnaire';

interface ScreeningProps {
   deal: Deal;
   ready: boolean; // every criterion scored with reasons, a decision, a second reviewer
   completing: boolean; // «Завершить скрининг» is on its way
   onComplete: () => void; // ends the screening as its decision says
   onRequest: () => void; // a request for data to the applicant
   onQuestionnaire: () => void; // asks the founder for the DD questionnaire
}

interface CriterionRowProps {
   dealId: string;
   item: ListItem; // the criterion of Настройки
   criterion: Criterion;
   editable: boolean;
   onChange: (patch: Partial<Criterion>) => Promise<unknown>;
}

// A criterion as the design draws it: its name and what it covers, the
// scale of 1 to 5 and its weight, and under them the reasons, their source
// and evidence.
const CriterionRow = ({
   dealId,
   item,
   criterion,
   editable,
   onChange,
}: CriterionRowProps) => {
   const { t } = useTranslation('deals');
   const title = nameOf(item);
   // typed text is kept here and saved when the field is left
   const [rationale, setRationale] = useState(criterion.rationale);
   const [source, setSource] = useState(criterion.source);
   const empty = !rationale.trim();
   const saving = useAction(onChange, {
      success: (patch) =>
         'score' in patch
            ? t('Балл сохранён')
            : 'rationale' in patch
              ? t('Комментарий сохранён')
              : t('Источник сохранён'),
   });
   // the score being saved, for its spinner
   const [scoring, setScoring] = useState<number | null>(null);

   return (
      <li className='px-4.5 py-3'>
         <div className='grid grid-cols-[minmax(0,1fr)_auto_2.5rem] items-center gap-3'>
            <div className='min-w-0'>
               <div className='font-semibold'>{title}</div>
               <div className='text-ink-soft text-xs'>{hintOf(item)}</div>
            </div>
            <div
               role='radiogroup'
               aria-label={`${t('Балл')}: ${title}`}
               className='flex gap-1'
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
                           'grid size-7.5 place-items-center rounded-md border font-bold tabular-nums transition-colors disabled:cursor-not-allowed',
                           chosen
                              ? 'border-navy bg-navy text-white'
                              : 'border-line-strong text-ink-soft enabled:hover:border-navy bg-white',
                        )}
                        disabled={!editable || saving.pending}
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
            <span className='text-ink-soft text-right text-xs tabular-nums'>
               {item.weight ?? 0}%
            </span>
         </div>
         <textarea
            aria-label={`${t('Комментарий')}: ${title}`}
            aria-invalid={criterion.score !== null && empty}
            className='field-input text-meta field-sizing-content disabled:bg-ground mt-2 min-h-9 resize-none py-2'
            disabled={!editable}
            placeholder={t('Комментарий по критерию: на чём основана оценка')}
            rows={1}
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
               {t('Напишите комментарий — без него балл не засчитывается')}
            </p>
         )}
         {!empty && (
            <label className='text-ink-soft mt-1.5 flex items-center gap-2 text-xs'>
               {t('Источник')}:
               <input
                  className='text-accent placeholder:text-ink-faint min-w-0 flex-1 bg-transparent font-medium'
                  disabled={!editable}
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
            className='mt-1.5'
            editable={editable}
            place={{ dealId, section: 'screening', itemId: criterion.key }}
         />
      </li>
   );
};

// The colour of a score: green from 4, amber from 3.2, red below.
const scoreTone = (score: number | null) =>
   score === null
      ? 'text-ink-faint'
      : score >= SCORE_THRESHOLD
        ? 'text-success'
        : score >= 3.2
          ? 'text-warning'
          : 'text-danger';

// The analyst's comment; a deal from before it was one field shows all of its.
const noteText = ({ note }: ScreeningData) =>
   [note.essence, note.whyNow, note.redFlags, note.questions]
      .filter(Boolean)
      .join('\n\n');

/* «Скрининг и оценка», as the design draws it, the same on every deal: the
   criteria of Настройки scored 1 to 5 with their weights, each with its
   reasons, and under them the analyst's comment; the founder's questionnaire;
   beside them the total score and the recommendation — the decision, the
   second reviewer and the buttons that end the screening — then the
   screening's materials and the application's facts. All of it is changed
   while the deal is open. */
const Screening = ({
   deal,
   ready,
   completing,
   onComplete,
   onRequest,
   onQuestionnaire,
}: ScreeningProps) => {
   const { t, i18n } = useTranslation('deals');
   const screening = deal.screening ?? emptyScreening();
   const editable = isOpen(deal);
   // the comment as typed, saved when the field is left
   const [comment, setComment] = useState(() => noteText(screening));
   const deciding = useAction(
      (decision: ScreeningDecision) =>
         deals.setScreening(deal.id, { decision }),
      { success: t('Решение сохранено') },
   );
   const noting = useRequest({ success: t('Комментарий сохранён') });

   const rows = scoreRows(deal);
   const scored = rows.filter(({ criterion }) => isScored(criterion));
   const total = weightedScore(scored);
   const formatScore = (score: number) =>
      new Intl.NumberFormat(i18n.resolvedLanguage ?? i18n.language, {
         minimumFractionDigits: 1,
         maximumFractionDigits: 1,
      }).format(score);
   const complete = rows.length > 0 && scored.length === rows.length;
   const choices: { value: ScreeningDecision; label: string; note: string }[] =
      [
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
            note: t('Причина из справочника, дата повторной подачи'),
         },
      ];
   const chosen = choices.find(({ value }) => value === screening.decision);

   const saveComment = () => {
      const text = comment.trim();
      if (text === noteText(screening)) return;
      void noting.run(() =>
         deals.setScreeningNote(deal.id, {
            essence: text,
            whyNow: '',
            redFlags: '',
            questions: '',
         }),
      );
   };

   return (
      <div className='gap-section grid flex-1 content-start xl:grid-cols-[minmax(0,1fr)_23.75rem]'>
         <div className={STACK}>
            <Card
               className='overflow-hidden'
               hint={t('шкала 1–5, вес критерия')}
               title={t('Оценка по критериям')}
            >
               <ol className='divide-line divide-y'>
                  {rows.map(({ item, criterion }) => (
                     <CriterionRow
                        key={item.key}
                        criterion={criterion}
                        dealId={deal.id}
                        editable={editable}
                        item={item}
                        onChange={(patch) =>
                           deals.setCriterion(deal.id, item.key, patch)
                        }
                     />
                  ))}
               </ol>
               <div className='border-line border-t px-4.5 py-4'>
                  <Field label={t('Общий комментарий аналитика')}>
                     <textarea
                        className='field-input text-meta field-sizing-content disabled:bg-ground min-h-24 resize-none'
                        disabled={!editable || noting.pending}
                        placeholder={t(
                           'Сильные стороны, риски, вопросы к основателю',
                        )}
                        value={comment}
                        onBlur={saveComment}
                        onChange={(event) => setComment(event.target.value)}
                     />
                  </Field>
               </div>
            </Card>
            <FounderQuestionnaire
               deal={deal}
               onQuestionnaire={onQuestionnaire}
            />
         </div>

         <div className={STACK}>
            <Card>
               <div className='grid justify-items-start gap-2.5 p-5'>
                  <span className='text-ink-soft text-xs'>
                     {t('Итоговый балл')}
                  </span>
                  <span
                     className={clsx(
                        'text-[40px] leading-none font-extrabold tabular-nums',
                        scoreTone(total),
                     )}
                  >
                     {total === null ? '—' : formatScore(total)}
                     <span className='text-ink-faint text-lg font-semibold'>
                        {' '}
                        / 5
                     </span>
                  </span>
                  <span className='text-ink-soft text-xs'>
                     {complete
                        ? t(
                             'Взвешенная сумма по критериям. {{threshold}} и выше: сделку рекомендуется вести дальше.',
                             { threshold: formatScore(SCORE_THRESHOLD) },
                          )
                        : t(
                             'Заполнено {{done}} из {{total}}. Итоговый балл появится, когда у всех критериев есть балл и комментарий.',
                             { done: scored.length, total: rows.length },
                          )}
                  </span>
                  {screening.savedAt && (
                     <span className='text-ink-faint text-xs'>
                        {t('Черновик сохранён {{time}}', {
                           time: screening.savedAt,
                        })}
                     </span>
                  )}
               </div>
            </Card>

            <Card title={t('Рекомендация')}>
               <div className='grid gap-3 p-5'>
                  <Field hint={chosen?.note} label={t('Решение по скринингу')}>
                     <select
                        className='field-input'
                        disabled={!editable || deciding.pending}
                        value={screening.decision}
                        onChange={(event) =>
                           event.target.value &&
                           deciding.run(
                              event.target.value as ScreeningDecision,
                           )
                        }
                     >
                        <option value=''>{t('Не выбрано')}</option>
                        {choices.map(({ value, label }) => (
                           <option key={value} value={value}>
                              {label}
                           </option>
                        ))}
                     </select>
                  </Field>
                  <Field label={t('Второй оценщик')}>
                     <SecondReviewer deal={deal} disabled={!editable} />
                  </Field>
                  {(total === null || total < SCORE_THRESHOLD) && (
                     <Notice warning icon={TriangleAlert}>
                        {total === null
                           ? t('Оценка по критериям не заполнена.')
                           : t('Балл {{score}} ниже порога {{threshold}}.', {
                                score: formatScore(total),
                                threshold: formatScore(SCORE_THRESHOLD),
                             })}{' '}
                        {t(
                           'Рекомендуем «Запросить данные» или «Отказать с причиной».',
                        )}
                     </Notice>
                  )}
                  {deal.status === 'active' && deal.stage === 'screening' && (
                     <p className='text-ink-soft text-xs'>
                        {t(
                           'Правило фонда: оценку проверяет второй сотрудник. «Завершить скрининг» включится, когда у всех критериев есть балл и комментарий, выбраны решение и второй оценщик.',
                        )}
                     </p>
                  )}
                  {editable && (
                     <div className='flex flex-wrap gap-2'>
                        {deal.status === 'active' &&
                           deal.stage === 'screening' && (
                              <Button
                                 disabled={!ready}
                                 loading={completing}
                                 onClick={onComplete}
                              >
                                 {t('Завершить скрининг')}
                              </Button>
                           )}
                        <Button variant='ghost' onClick={onRequest}>
                           {t('Запросить данные')}
                        </Button>
                     </div>
                  )}
                  {editable &&
                     deal.status === 'active' &&
                     deal.stage === 'screening' &&
                     !ready && (
                        <p className='text-ink-soft text-xs'>
                           {t(
                              'Нужны комментарии по всем критериям, решение и второй оценщик',
                           )}
                        </p>
                     )}
               </div>
            </Card>

            <Card title={t('Материалы скрининга')}>
               <div className='px-5 py-4'>
                  <Attachments
                     editable={editable}
                     empty={t(
                        'Ссылки и файлы скрининга: презентация, финмодель, заметки со звонка.',
                     )}
                     place={{ dealId: deal.id, section: 'screening' }}
                  />
               </div>
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
