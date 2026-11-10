import { Table, TD, TH } from '@shared/components';
import { downloadCsv } from '@shared/helpers';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

// One row of P&L or Cash Flow: a group's heading, a line item or a total.
export interface ReportLine {
   key: string;
   kind: 'group' | 'line' | 'total';
   label: string; // as the file writes it
   labelNode?: ReactNode; // shown in its place, e.g. with the tax rate to change
   link?: string; // a line item's operations
   values: number[]; // one a column
   total?: number;
   budget?: number; // the year's plan, signed as the figures
   budgetNode?: ReactNode; // shown in its place: the budget to change
   cell?: (index: number) => ReactNode; // a column's figure to change, in its place
}

interface ReportTableProps {
   columns: string[]; // months or quarters
   lines: ReportLine[];
   totalLabel: string; // «Итого 2026»
   budgetLabels?: [string, string]; // «Бюджет 2026», «Исполнение»; none: no budget
   format: (value: number) => string;
   linkHint: string;
}

// The line item's column stays at the left while the months scroll by.
const FIRST = 'sticky left-0 z-[1] min-w-60 bg-inherit';
const NUM = clsx(TD, 'text-right whitespace-nowrap tabular-nums');

// How much of the plan is done: 45%
export const shareOf = (fact: number, plan: number | undefined) =>
   plan ? `${Math.round((Math.abs(fact) / Math.abs(plan)) * 100)}%` : '';

const Figure = ({
   value,
   format,
   strong,
   node,
}: {
   value: number;
   format: (value: number) => string;
   strong?: boolean;
   node?: ReactNode; // the figure to change, in place of the text
}) => (
   <td className={clsx(NUM, value < 0 && 'text-danger', strong && 'font-bold')}>
      {node ??
         (value ? format(value) : <span className='text-ink-faint'>—</span>)}
   </td>
);

/* P&L's and Cash Flow's table: the line items by month or quarter, the
   year's total, and for P&L the budget and how much of it is done. The
   same rows go to Excel (exportReport), so the file is what the page shows. */
const ReportTable = ({
   columns,
   lines,
   totalLabel,
   budgetLabels,
   format,
   linkHint,
}: ReportTableProps) => {
   const span = columns.length + (budgetLabels ? 4 : 2);
   return (
      <Table
         head={
            <>
               <th className={clsx(TH, FIRST)} />
               {columns.map((column) => (
                  <th key={column} className={clsx(TH, 'text-right')}>
                     {column}
                  </th>
               ))}
               <th className={clsx(TH, 'text-right')}>{totalLabel}</th>
               {budgetLabels?.map((label) => (
                  <th key={label} className={clsx(TH, 'text-right')}>
                     {label}
                  </th>
               ))}
            </>
         }
      >
         {lines.map((line) =>
            line.kind === 'group' ? (
               <tr key={line.key} className='bg-ground'>
                  <td
                     className={clsx(
                        TD,
                        FIRST,
                        'text-ink-soft py-2 text-[11px] font-bold tracking-wide uppercase',
                     )}
                  >
                     {line.label}
                  </td>
                  <td className='py-2' colSpan={span - 1} />
               </tr>
            ) : (
               <tr
                  key={line.key}
                  className={clsx(
                     'bg-white',
                     line.kind === 'total' && 'font-bold',
                  )}
               >
                  <td className={clsx(TD, FIRST)}>
                     {line.labelNode ??
                        (line.link ? (
                           <Link
                              className='hover:text-accent hover:underline'
                              data-hint={linkHint}
                              to={line.link}
                           >
                              {line.label}
                           </Link>
                        ) : (
                           line.label
                        ))}
                  </td>
                  {line.values.map((value, index) => (
                     <Figure
                        key={columns[index]}
                        format={format}
                        node={line.cell?.(index)}
                        value={value}
                     />
                  ))}
                  <Figure strong format={format} value={line.total ?? 0} />
                  {budgetLabels && (
                     <>
                        <td
                           className={clsx(
                              NUM,
                              (line.budget ?? 0) < 0 && 'text-danger',
                           )}
                        >
                           {line.budgetNode ??
                              (line.budget ? (
                                 format(line.budget)
                              ) : (
                                 <span className='text-ink-faint'>—</span>
                              ))}
                        </td>
                        <td className={clsx(NUM, 'text-ink-soft font-normal')}>
                           {shareOf(line.total ?? 0, line.budget) || '—'}
                        </td>
                     </>
                  )}
               </tr>
            ),
         )}
      </Table>
   );
};

/* The report as a CSV file Excel opens: the figures as plain numbers with a
   decimal comma, so Excel counts with them. */
export const exportReport = (
   name: string,
   head: string[], // the line item's column, the periods, the total, the budget's
   lines: ReportLine[],
   withBudget: boolean,
) => {
   const figure = (value: number | undefined) =>
      value ? String(Math.round(value * 100) / 100).replace('.', ',') : '';
   downloadCsv(name, [
      head,
      ...lines.map((line) =>
         line.kind === 'group'
            ? [line.label]
            : [
                 line.label,
                 ...line.values.map(figure),
                 figure(line.total),
                 ...(withBudget
                    ? [
                         figure(line.budget),
                         shareOf(line.total ?? 0, line.budget),
                      ]
                    : []),
              ],
      ),
   ]);
};

export default ReportTable;
