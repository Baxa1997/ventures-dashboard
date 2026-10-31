import {
   deadlineLabel,
   getDeadline,
   stageKeys,
   stageName,
   stageNorm,
} from '@modules/Deals/helpers';
import { CompanyMark, Timeline, TONE_COLORS } from '@shared/components';
import {
   addWorkingDays,
   formatNumericDate,
   type TimelineGrid,
   timelineShare,
   todayISO,
} from '@shared/helpers';
import type { Deal } from '@shared/types/deals.types';
import clsx from 'clsx';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { columnTone } from '../helpers';

interface DealTimelineProps {
   deals: Deal[];
}

type BarKind = 'done' | 'current' | 'forecast';

interface Bar {
   key: string;
   stage: string;
   from: string; // YYYY-MM-DD
   to: string; // the last day it covers
   due: string; // the stage's deadline, '' when it has none
   kind: BarKind;
   late: boolean; // a past stage that took longer than its norm
}

// A stage's colour: the part of the way it belongs to.
const colorOf = (stage: string) =>
   TONE_COLORS[columnTone(stage === 'portfolio' ? 'status:portfolio' : stage)];

const later = (a: string, b: string) => (a > b ? a : b);

/* A deal's stages as bars: those it has passed, the one it is on (to its
   deadline, or to today once past it, the late part hatched in red), and
   the ones ahead at their norms, dashed. */
const barsOf = (deal: Deal, today: string): Bar[] => {
   const records = deal.stages ?? [];
   const bars: Bar[] = records.map((record, index) => {
      const current = !record.leftAt && deal.status === 'active';
      const deadline = current ? getDeadline(deal) : null;
      let due = '';
      if (deadline?.kind === 'left')
         due = addWorkingDays(today, deadline.days);
      else if (deadline?.kind === 'overdue')
         due = addWorkingDays(today, -deadline.days);
      else if (record.norm) due = addWorkingDays(record.enteredAt, record.norm);
      return {
         key: `${record.stage}-${index}`,
         stage: record.stage,
         from: record.enteredAt,
         to: record.leftAt || (current && due ? later(due, today) : today),
         due,
         kind: current ? 'current' : 'done',
         late: record.late,
      };
   });
   const current = bars.find(({ kind }) => kind === 'current');
   if (!current) return bars;
   // the stages ahead, one after another at their norms
   const keys = stageKeys();
   let start = later(current.due || today, today);
   for (const stage of keys.slice(keys.indexOf(deal.stage) + 1)) {
      const norm = stageNorm(stage);
      if (!norm) continue;
      const end = addWorkingDays(start, norm);
      bars.push({
         key: `forecast-${stage}`,
         stage,
         from: start,
         to: end,
         due: '',
         kind: 'forecast',
         late: false,
      });
      start = end;
   }
   return bars;
};

const BAR =
   'absolute top-1/2 flex h-6 min-w-1.5 -translate-y-1/2 items-center overflow-hidden rounded-md border';

/* «Таймлайн»: each deal's way through the stages over weeks or months,
   with each stage's deadline and lateness. A bar or a name opens the
   deal's card. */
const DealTimeline = ({ deals }: DealTimelineProps) => {
   const { t } = useTranslation('deals');
   const navigate = useNavigate();
   const today = todayISO();

   const placed = (grid: TimelineGrid, bar: Bar) => {
      const first = Math.max(0, grid.index(bar.from));
      const end = Math.min(grid.total, grid.index(bar.to) + 1);
      return end > 0 && first < grid.total ? { first, end } : null;
   };

   const rows = (grid: TimelineGrid) =>
      deals
         .filter(({ stages }) => stages?.length)
         .map((deal) => {
            const deadline = getDeadline(deal);
            const status =
               deal.status === 'active' && deadline.kind !== 'none'
                  ? deadlineLabel(t, deadline).toLowerCase()
                  : '';
            return {
               id: deal.id,
               name: (
                  <button
                     type='button'
                     className='flex w-full min-w-0 items-center gap-2.5 py-1 text-left'
                     data-hint={t('Открыть карточку сделки')}
                     onClick={() => navigate(`/deals/${deal.id}`)}
                  >
                     <CompanyMark name={deal.company} />
                     <span className='grid min-w-0'>
                        <b className='text-meta truncate'>{deal.company}</b>
                        <span className='text-ink-faint truncate text-xs'>
                           {stageName(deal.stage)}
                           {status && ' · '}
                           <span
                              className={clsx(
                                 deadline.kind === 'overdue' &&
                                    'text-danger font-semibold',
                              )}
                           >
                              {status}
                           </span>
                        </span>
                     </span>
                  </button>
               ),
               bars: barsOf(deal, today).map((bar) => {
                  const at = placed(grid, bar);
                  if (!at) return null;
                  const color = colorOf(bar.stage);
                  const name =
                     bar.stage === 'portfolio'
                        ? t('Портфель')
                        : stageName(bar.stage);
                  const overdue =
                     bar.kind === 'current' && bar.due && today > bar.due;
                  const dueAt = bar.due ? grid.index(bar.due) + 1 : -1;
                  const style: CSSProperties = {
                     left: timelineShare(at.first, grid.total),
                     width: `calc(${timelineShare(at.end - at.first, grid.total)} - 2px)`,
                     borderColor: color,
                     background:
                        bar.kind === 'forecast'
                           ? 'transparent'
                           : `color-mix(in srgb, ${color} ${bar.kind === 'done' ? 10 : 22}%, white)`,
                  };
                  return (
                     <span key={bar.key} className='contents'>
                        <button
                           type='button'
                           className={clsx(
                              BAR,
                              bar.kind === 'current'
                                 ? 'hover:shadow-raised z-1'
                                 : 'border-dashed',
                              bar.kind === 'forecast' && 'opacity-70',
                              bar.late &&
                                 'shadow-[inset_0_-3px_0_var(--color-danger)]',
                           )}
                           style={style}
                           data-hint={[
                              bar.kind === 'forecast'
                                 ? t('{{stage}} (прогноз по нормативу)', {
                                      stage: name,
                                   })
                                 : name,
                              `${formatNumericDate(bar.from)} – ${formatNumericDate(bar.to)}`,
                              bar.due &&
                                 t('срок {{date}}', {
                                    date: formatNumericDate(bar.due),
                                 }),
                           ]
                              .filter(Boolean)
                              .join(' · ')}
                           onClick={() => navigate(`/deals/${deal.id}`)}
                        >
                           {overdue && dueAt > at.first && (
                              <i
                                 aria-hidden
                                 className='absolute inset-y-0 right-0 bg-[repeating-linear-gradient(135deg,rgb(214_69_69/0.35)_0_5px,rgb(214_69_69/0.15)_5px_10px)]'
                                 style={{
                                    left: `${(((dueAt - at.first) / (at.end - at.first)) * 100).toFixed(2)}%`,
                                 }}
                              />
                           )}
                           <em
                              className={clsx(
                                 'relative truncate px-1.5 text-[11px] not-italic',
                                 bar.kind === 'current'
                                    ? 'text-ink font-semibold'
                                    : 'text-ink-faint font-medium',
                              )}
                           >
                              {name}
                           </em>
                        </button>
                        {bar.kind === 'current' &&
                           bar.due &&
                           dueAt > 0 &&
                           dueAt <= grid.total && (
                              <i
                                 aria-hidden
                                 className={clsx(
                                    'absolute top-1/2 z-2 size-2.75 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] border-2 border-white',
                                    overdue ? 'bg-danger' : 'bg-ink',
                                 )}
                                 style={{
                                    left: timelineShare(dueAt, grid.total),
                                 }}
                                 title={t('Срок этапа: {{date}}', {
                                    date: formatNumericDate(bar.due),
                                 })}
                              />
                           )}
                     </span>
                  );
               }),
            };
         });

   const swatch = (tone: Parameters<typeof columnTone>[0]) => (
      <i
         aria-hidden
         className='inline-block size-3 rounded-[3px]'
         style={{ background: colorOf(tone) }}
      />
   );

   return (
      <Timeline
         empty={t('Нет сделок с историей этапов')}
         hint={t('Полосы — этапы сделки; нормативы — «Настройки → Этапы и нормативы»')}
         nameLabel={t('Сделка')}
         rows={rows}
         scales={['week', 'month']}
         weeksBack={10}
         legend={
            <>
               <span className='inline-flex items-center gap-1.5'>
                  {swatch('inbox')}
                  {t('Новая заявка')}
               </span>
               <span className='inline-flex items-center gap-1.5'>
                  {swatch('screening')}
                  {t('Работа над сделкой')}
               </span>
               <span className='inline-flex items-center gap-1.5'>
                  {swatch('ic1')}
                  {t('Комитеты и закрытие')}
               </span>
               <span className='inline-flex items-center gap-1.5'>
                  <i
                     aria-hidden
                     className='bg-ink inline-block size-2.5 rotate-45 rounded-[2px]'
                  />
                  {t('Срок этапа')}
               </span>
               <span className='inline-flex items-center gap-1.5'>
                  <i
                     aria-hidden
                     className='bg-danger inline-block size-3 rounded-[3px]'
                  />
                  {t('Просрочка')}
               </span>
               <span className='inline-flex items-center gap-1.5'>
                  <i
                     aria-hidden
                     className='border-neutral inline-block size-3 rounded-[3px] border border-dashed'
                  />
                  {t('Прогноз по нормативам')}
               </span>
            </>
         }
      />
   );
};

export default DealTimeline;
