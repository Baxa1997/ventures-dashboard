import {
   createRow,
   day,
   deleteRow,
   listRows,
   type Row,
   str,
   updateRow,
} from '@shared/api/ucode';
import { createStore, newId, todayISO } from '@shared/helpers';
import type {
   DocCategory,
   DocumentInput,
   FileFolder,
   FolderPlace,
   FundDocument,
   GovernanceIssue,
   IssueInput,
   IssueStatus,
} from '@shared/types/documents.types';

/* Документы фонда in ucode (docs/ucode-migration.md, batch 6): fund_documents
   and governance_issues. A change is written to ucode, then both are read
   again, so the page shows what ucode keeps. */

export interface DocumentsState {
   documents: FundDocument[];
   issues: GovernanceIssue[];
   folders: FileFolder[]; // the fund's own modules and folders (batch 29)
}

const toDocument = (row: Row): FundDocument => ({
   id: row.guid,
   category: (str(row.category) || 'corporate') as FundDocument['category'],
   title: str(row.title),
   note: str(row.note),
   approvedBy: (str(row.approved_by) ||
      'director') as FundDocument['approvedBy'],
   status: (str(row.status) || 'draft') as FundDocument['status'],
   date: day(row.doc_date),
   link: str(row.link),
   createdById: str(row.created_by_id),
   folderId: str(row.folder_id),
});

const toFolder = (row: Row): FileFolder => ({
   id: row.guid,
   name: str(row.name),
   hint: str(row.hint),
   parent: str(row.parent),
   sort: Number(row.sort) || 0,
   createdById: str(row.created_by_id),
});

// A section of «Фонд» as a place: 'fund:hr' → 'hr'
export const sectionOf = (place: FolderPlace) =>
   place.startsWith('fund:') ? (place.slice(5) as DocCategory) : null;

const toIssue = (row: Row): GovernanceIssue => ({
   id: row.guid,
   title: str(row.title),
   note: str(row.note),
   status: (str(row.status) || 'in_work') as IssueStatus,
   openedAt: day(row.opened_at),
   resolvedAt: day(row.resolved_at),
   ownerId: str(row.owner_id),
});

const documentRow = (input: DocumentInput) => ({
   category: input.category,
   title: input.title,
   note: input.note,
   approved_by: input.approvedBy,
   status: input.status,
   doc_date: input.date || null,
   link: input.link,
});

// Those no longer in force last; otherwise the newest first.
const byStatusAndDate = (a: FundDocument, b: FundDocument) =>
   Number(a.status === 'archived') - Number(b.status === 'archived') ||
   b.date.localeCompare(a.date) ||
   a.title.localeCompare(b.title);

const store = createStore<DocumentsState>(async () => {
   const [documents, issues, folders] = await Promise.all([
      listRows('fund_documents'),
      listRows('governance_issues'),
      // a project without batch 29 has none
      listRows('file_folders').catch(() => [] as Row[]),
   ]);
   return {
      folders: folders
         .map(toFolder)
         .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name)),
      documents: documents.map(toDocument).sort(byStatusAndDate),
      issues: issues
         .map(toIssue)
         .sort((a, b) => b.openedAt.localeCompare(a.openedAt)),
   };
});

// "№ 3Р от 30.07.2026" → 3
const orderNumber = (title: string) =>
   Number(/№\s*(\d+)/.exec(title)?.[1] ?? 0);

class Documents {
   subscribe(listener: () => void) {
      return store.subscribe(listener);
   }

   async getState(): Promise<DocumentsState> {
      return store.get();
   }

   // `folderId`: made inside a folder of the fund's own, '' — in its section
   async addDocument(input: DocumentInput, userId: string, folderId = '') {
      const id = newId();
      await createRow('fund_documents', {
         guid: id,
         ...documentRow(input),
         folder_id: folderId,
         created_by_id: userId,
      });
      await store.reload();
      return id;
   }

   async updateDocument(id: string, input: DocumentInput) {
      await updateRow('fund_documents', { guid: id, ...documentRow(input) });
      await store.reload();
   }

   // The row only: the file stays where the fund keeps it.
   async removeDocument(id: string) {
      await deleteRow('fund_documents', id);
      await store.reload();
   }

   /* A document moved: into a section of «Фонд» ('fund:hr'), which it then
      belongs to, or into a folder of the fund's own (its id). */
   async moveDocument(id: string, place: FolderPlace) {
      const section = sectionOf(place);
      await updateRow('fund_documents', {
         guid: id,
         ...(section ? { category: section, folder_id: '' } : { folder_id: place }),
      });
      await store.reload();
   }

   // ---- the fund's own modules and folders (batch 29)

   async addFolder(
      input: Pick<FileFolder, 'name' | 'hint' | 'parent'>,
      userId: string,
   ) {
      const { folders } = await store.get();
      const id = newId();
      await createRow('file_folders', {
         guid: id,
         name: input.name,
         hint: input.hint,
         parent: input.parent,
         sort: Math.max(0, ...folders.map(({ sort }) => sort)) + 1,
         created_by_id: userId,
      });
      await store.reload();
      return id;
   }

   async updateFolder(id: string, input: Pick<FileFolder, 'name' | 'hint'>) {
      await updateRow('file_folders', { guid: id, ...input });
      await store.reload();
   }

   // the folders inside one, at any depth
   insideOf(folders: FileFolder[], id: string): string[] {
      const direct = folders.filter(({ parent }) => parent === id);
      return direct.flatMap((one) => [one.id, ...this.insideOf(folders, one.id)]);
   }

   // A folder moved to another place; never into itself or a folder inside it.
   async moveFolder(id: string, place: FolderPlace) {
      const { folders } = await store.get();
      if (place === id || this.insideOf(folders, id).includes(place))
         throw new Error('Папку нельзя переместить в неё саму');
      await updateRow('file_folders', { guid: id, parent: place });
      await store.reload();
   }

   /* Deletes a folder; what it held, folders and documents, moves one level
      up, so nothing is lost: into the folder it sat in, or back into its
      documents' own sections. */
   async removeFolder(id: string) {
      const { folders, documents } = await store.get();
      const folder = folders.find((one) => one.id === id);
      if (!folder) return;
      const up = folder.parent;
      const intoFolder = up && up !== 'fund' && !sectionOf(up);
      for (const child of folders.filter(({ parent }) => parent === id))
         await updateRow('file_folders', { guid: child.id, parent: up });
      for (const document of documents.filter(({ folderId }) => folderId === id))
         await updateRow('fund_documents', {
            guid: document.id,
            folder_id: intoFolder ? up : '',
            ...(sectionOf(up) && { category: sectionOf(up) }),
         });
      await deleteRow('file_folders', id);
      await store.reload();
   }

   // The next order number of this year: № 3Р → № 4Р.
   async nextOrderNumber() {
      const year = todayISO().slice(0, 4);
      const numbers = (await store.get()).documents
         .filter(
            ({ category, date }) =>
               category === 'orders' && date.startsWith(year),
         )
         .map(({ title }) => orderNumber(title));
      return `№ ${Math.max(0, ...numbers) + 1}Р`;
   }

   async addIssue(input: IssueInput) {
      const id = newId();
      await createRow('governance_issues', {
         guid: id,
         title: input.title,
         note: input.note,
         owner_id: input.ownerId,
         status: 'in_work',
         opened_at: todayISO(),
      });
      await store.reload();
      return id;
   }

   // A question's title, note or owner, changed where it stands.
   async updateIssue(
      id: string,
      patch: Partial<Pick<GovernanceIssue, 'title' | 'note' | 'ownerId'>>,
   ) {
      await updateRow('governance_issues', {
         guid: id,
         ...(patch.title !== undefined && { title: patch.title }),
         ...(patch.note !== undefined && { note: patch.note }),
         ...(patch.ownerId !== undefined && { owner_id: patch.ownerId }),
      });
      await store.reload();
   }

   // A question raised by mistake; a settled one is marked resolved instead.
   async removeIssue(id: string) {
      await deleteRow('governance_issues', id);
      await store.reload();
   }

   async setIssueStatus(id: string, status: IssueStatus) {
      await updateRow('governance_issues', {
         guid: id,
         status,
         resolved_at: status === 'resolved' ? todayISO() : null,
      });
      await store.reload();
   }
}

export default new Documents();
