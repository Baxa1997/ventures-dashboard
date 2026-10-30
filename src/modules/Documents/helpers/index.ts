import type { BadgeTone } from '@shared/components';
import type { Attachment } from '@shared/types/attachments.types';
import type { Meeting } from '@shared/types/committee.types';
import type { Deal, DealDocument, DealFolder } from '@shared/types/deals.types';
import type { FundDocument } from '@shared/types/documents.types';
import {
   FileArchive,
   FileHeadphone,
   FileSpreadsheet,
   FileText,
   type LucideIcon,
   Presentation,
} from 'lucide-react';
import { RECORDING, type SortKey } from '../constants';

/* Where the manager is open, as the address keeps it (?in=deals/<id>/<f>):
   [] the modules; ['fund', section]; ['deals', deal, folder], the innermost
   folder only, since a data room's folders sit inside one another; and
   ['ic', meeting, question]. */
export type FilePath = string[];

export const pathFrom = (value: string | null): FilePath =>
   value ? value.split('/').filter(Boolean) : [];

// What a row stands for, and so what can be done with it.
export type FileSubject =
   | { type: 'folder' } // a module, a section of the fund, a question
   | { type: 'deal'; deal: Deal }
   | { type: 'deal_folder'; deal: Deal; folder: DealFolder }
   | { type: 'meeting'; meeting: Meeting }
   | { type: 'fund_document'; document: FundDocument }
   | { type: 'deal_document'; deal: Deal; document: DealDocument }
   | { type: 'ic_file'; meeting: Meeting; file: Attachment }
   | { type: 'protocol'; meeting: Meeting };

export interface FileNode {
   key: string;
   name: string;
   hint: string; // under the name: a stage, a note; '' for none
   owner: string; // who keeps it: an employee, the applicant, the fund
   date: string; // YYYY-MM-DD, or with the time; '' when not known
   // a folder: where it opens and how much it holds directly
   folder?: { path: FilePath; count: number; icon?: LucideIcon };
   status?: { label: string; tone: BadgeTone }; // a file's
   url: string; // where a file opens; '' for a folder or a file without one
   where?: FilePath; // a search result: the folder it lies in
   subject: FileSubject;
}

// The newest of the dates, '' for none.
export const latest = (dates: string[]) =>
   dates.reduce((last, date) => (date > last ? date : last), '');

// Folders first; then by the column, either way.
export const sortNodes = (nodes: FileNode[], key: SortKey, dir: 1 | -1) => {
   const value = (node: FileNode) => {
      if (key === 'name') return node.name;
      if (key === 'owner') return node.owner;
      if (key === 'date') return node.date;
      return node.folder ? node.folder.count : (node.status?.label ?? '');
   };
   return [...nodes].sort((a, b) => {
      if (!a.folder !== !b.folder) return a.folder ? -1 : 1;
      const x = value(a);
      const y = value(b);
      const order =
         typeof x === 'number' && typeof y === 'number'
            ? x - y
            : String(x).localeCompare(String(y));
      return order * dir;
   });
};

// A file's icon and its colour, by its name's extension.
export const fileLook = (name: string): { icon: LucideIcon; tone: string } => {
   if (/\.(xlsx?|csv)$/i.test(name))
      return { icon: FileSpreadsheet, tone: 'text-success' };
   if (/\.pdf$/i.test(name)) return { icon: FileText, tone: 'text-danger' };
   if (/\.docx?$/i.test(name)) return { icon: FileText, tone: 'text-accent' };
   if (/\.pptx?$/i.test(name))
      return { icon: Presentation, tone: 'text-warning' };
   if (/\.(zip|rar|7z)$/i.test(name))
      return { icon: FileArchive, tone: 'text-ink-soft' };
   if (RECORDING.test(name)) return { icon: FileHeadphone, tone: 'text-info' };
   return { icon: FileText, tone: 'text-ink-faint' };
};
