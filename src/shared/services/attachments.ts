import {
   createRow,
   deleteFile,
   deleteRow,
   listRows,
   type Row,
   str,
   updateRow,
   uploadFile,
} from '@shared/api/ucode';
import { createStore, newId } from '@shared/helpers';
import type {
   Attachment,
   AttachmentPlace,
} from '@shared/types/attachments.types';
import dayjs from 'dayjs';

/* The links and files kept on deals and portfolio companies, in ucode's
   attachments table. A file goes to ucode Files first (a folder per section
   of the panel) and its row keeps the address; removing the row removes the
   file. */

const toAttachment = (row: Row): Attachment => ({
   id: row.guid,
   kind: row.kind === 'file' ? 'file' : 'link',
   title: str(row.title),
   url: str(row.url),
   fileId: str(row.file_id),
   section: str(row.section),
   itemId: str(row.item_id),
   dealId: str(row.deals_id),
   companyId: str(row.portfolio_companies_id),
   addedById: str(row.added_by_id),
   addedAt: row.added_at
      ? dayjs(str(row.added_at)).format('YYYY-MM-DD HH:mm')
      : '',
});

const store = createStore(async () =>
   (await listRows('attachments'))
      .map(toAttachment)
      .sort((a, b) => a.addedAt.localeCompare(b.addedAt)),
);

// The attachments of one place on a card, oldest first.
export const attachmentsAt = (all: Attachment[], place: AttachmentPlace) =>
   all.filter(
      (item) =>
         item.section === place.section &&
         item.itemId === (place.itemId ?? '') &&
         (place.dealId ? item.dealId === place.dealId : true) &&
         (place.companyId ? item.companyId === place.companyId : true),
   );

const rowOf = (
   place: AttachmentPlace,
   item: Pick<Attachment, 'kind' | 'title' | 'url' | 'fileId'>,
   userId: string,
) => ({
   guid: newId(),
   kind: item.kind,
   title: item.title,
   url: item.url,
   file_id: item.fileId,
   section: place.section,
   item_id: place.itemId ?? '',
   deals_id: place.dealId || null,
   portfolio_companies_id: place.companyId || null,
   added_by_id: userId,
   added_at: new Date().toISOString(),
});

class Attachments {
   subscribe(listener: () => void) {
      return store.subscribe(listener);
   }

   async getAll(): Promise<Attachment[]> {
      return store.get();
   }

   async addLink(
      place: AttachmentPlace,
      link: { title: string; url: string },
      userId: string,
   ) {
      await createRow(
         'attachments',
         rowOf(place, { kind: 'link', ...link, fileId: '' }, userId),
      );
      await store.reload();
   }

   /* Files kept elsewhere, attached by their address: a request's templates.
      A copy has no file id of its own, so removing it leaves the file. */
   async addCopies(
      place: AttachmentPlace,
      files: { title: string; url: string }[],
      userId: string,
   ) {
      await Promise.all(
         files.map((file) =>
            createRow(
               'attachments',
               rowOf(place, { kind: 'file', ...file, fileId: '' }, userId),
            ),
         ),
      );
      await store.reload();
   }

   // Stores the files one by one; those stored before a failure are kept.
   async uploadFiles(place: AttachmentPlace, files: File[], userId: string) {
      const folder = place.companyId ? 'Portfolio' : 'Deals';
      try {
         for (const file of files) {
            const stored = await uploadFile(file, folder);
            await createRow(
               'attachments',
               rowOf(
                  place,
                  {
                     kind: 'file',
                     title: stored.name,
                     url: stored.url,
                     fileId: stored.id,
                  },
                  userId,
               ),
            );
         }
      } finally {
         await store.reload();
      }
   }

   // A link's title and address, or a file's title; a file keeps its address.
   async update(id: string, input: { title: string; url?: string }) {
      await updateRow('attachments', { guid: id, ...input });
      await store.reload();
   }

   async remove(id: string) {
      const item = (await store.get()).find((one) => one.id === id);
      if (!item) return;
      await deleteRow('attachments', id);
      await deleteFile(item.fileId);
      await store.reload();
   }

   // Every link and file of a place, as the item they belong to is deleted.
   async removeAt(place: AttachmentPlace) {
      const items = attachmentsAt(await store.get(), place);
      if (!items.length) return;
      await Promise.all(items.map(({ id }) => deleteRow('attachments', id)));
      await Promise.all(items.map(({ fileId }) => deleteFile(fileId)));
      await store.reload();
   }
}

export default new Attachments();
