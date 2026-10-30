import { MEETING_STATUS, PROTOCOL_STATES } from '@modules/Committee/constants';
import { itemBadge, meetingTitle } from '@modules/Committee/helpers';
import committee, { type CommitteeState } from '@modules/Committee/services';
import {
   DOCUMENT_STATUS_LABELS,
   DOCUMENT_STATUS_TONES,
} from '@modules/Deals/constants';
import { isOpen } from '@modules/Deals/helpers';
import { useDeals } from '@modules/Deals/hooks';
import { stageName } from '@modules/Settings/services';
import { personName } from '@shared/helpers';
import { useServiceData } from '@shared/hooks';
import attachments from '@shared/services/attachments';
import type { Attachment } from '@shared/types/attachments.types';
import type {
   Deal,
   DealDocument,
   DealFolder,
} from '@shared/types/deals.types';
import { Gavel, Handshake, Landmark } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
   APPROVERS,
   AREA_HINTS,
   AREA_LABELS,
   AREAS,
   CATEGORIES,
   CATEGORY_LABELS,
   RECORDING,
   STATUSES,
} from '../constants';
import { type FileNode, type FilePath, latest } from '../helpers';
import documents, { type DocumentsState } from '../services';

export interface FilesData {
   fund: DocumentsState;
   deals: Deal[];
   committee: CommitteeState;
   attachments: Attachment[];
}

const loadFund = () => documents.getState();
const onFund = (listener: () => void) => documents.subscribe(listener);
const loadCommittee = () => committee.getState();
const onCommittee = (listener: () => void) => committee.subscribe(listener);
const loadFiles = () => attachments.getAll();
const onFiles = (listener: () => void) => attachments.subscribe(listener);

// Everything the manager shows, each read again after a change; null until
// all of it has been read once.
export const useFilesData = (): FilesData | null => {
   const fund = useServiceData(loadFund, onFund);
   const { deals, loading } = useDeals();
   const meetings = useServiceData(loadCommittee, onCommittee);
   const files = useServiceData(loadFiles, onFiles);
   if (!fund || loading || !meetings || !files) return null;
   return { fund, deals, committee: meetings, attachments: files };
};

export interface Crumb {
   label: string;
   path: FilePath;
}

const FUND = 'SQB Ventures'; // the owner of what is the fund's as a whole

// The committee's files of a question: its materials and its recordings.
const isCommitteeFile = (file: Attachment, itemId: string) =>
   file.itemId === itemId &&
   (file.section === 'committee' || file.section === 'committee_record');

/* The manager's folders and files, built from what the panel keeps: the
   fund's register by section, each deal's data room with its own folders,
   and each meeting's questions with their files. `children` lists a
   folder, `filesUnder` every file below it (for the search), `crumbs` the
   way to it — null when it is gone. */
export const useFileTree = (data: FilesData) => {
   const { t } = useTranslation('documents');
   const { t: tc } = useTranslation('committee');
   const { t: td } = useTranslation('deals');

   // a deal's data room shows the deals that have one or may get one
   const deals = data.deals.filter(
      (deal) =>
         isOpen(deal) || deal.documents?.length || deal.folders?.length,
   );
   const meetings = [...data.committee.meetings].sort((a, b) =>
      b.date.localeCompare(a.date),
   );
   const dealOf = (id: string) => deals.find((deal) => deal.id === id);
   const meetingOf = (id: string) =>
      meetings.find((meeting) => meeting.id === id);

   // a document in a folder that is gone lies at the top, as on the card
   const placeOf = (deal: Deal, document: DealDocument) =>
      deal.folders?.some(({ id }) => id === document.folderId)
         ? document.folderId
         : '';

   const dealDocumentNode = (
      deal: Deal,
      document: DealDocument,
   ): FileNode => ({
      key: `dd:${document.id}`,
      name: document.title,
      hint: document.version > 0 ? `v${document.version}` : '',
      owner:
         document.uploadedBy === 'applicant'
            ? deal.applicantName || t('Заявитель')
            : personName(document.uploadedById) ||
              personName(document.handled?.byId ?? '') ||
              FUND,
      date: document.uploadedAt || (document.handled?.at ?? ''),
      status: {
         label: td(DOCUMENT_STATUS_LABELS[document.status]),
         tone: DOCUMENT_STATUS_TONES[document.status],
      },
      url: document.url,
      subject: { type: 'deal_document', deal, document },
   });

   // a data room's level: its folders, then its documents
   const dealLevel = (deal: Deal, folderId: string): FileNode[] => {
      const folders = (deal.folders ?? []).filter(
         (folder) => folder.parentId === folderId && folder.id !== folderId,
      );
      const files = (deal.documents ?? []).filter(
         (document) => placeOf(deal, document) === folderId,
      );
      return [
         ...folders.map((folder): FileNode => {
            const inner = dealLevel(deal, folder.id);
            return {
               key: `df:${folder.id}`,
               name: folder.name,
               hint: '',
               owner: personName(folder.createdById) || FUND,
               date: latest(inner.map(({ date }) => date)),
               folder: {
                  path: ['deals', deal.id, folder.id],
                  count: inner.length,
               },
               url: '',
               subject: { type: 'deal_folder', deal, folder },
            };
         }),
         ...files.map((document) => dealDocumentNode(deal, document)),
      ];
   };

   const fundLevel = (category: string): FileNode[] =>
      data.fund.documents
         .filter((document) => document.category === category)
         .map((document) => ({
            key: `fd:${document.id}`,
            name: document.title,
            hint:
               document.category === 'orders'
                  ? document.note
                  : [document.note, t(APPROVERS[document.approvedBy])]
                       .filter(Boolean)
                       .join(' · '),
            owner: personName(document.createdById) || FUND,
            date: document.date,
            status: {
               label: t(STATUSES[document.status].label),
               tone: STATUSES[document.status].tone,
            },
            url: document.link,
            subject: { type: 'fund_document', document },
         }));

   const committeeLevel = (meetingId: string, itemId: string): FileNode[] => {
      const meeting = meetingOf(meetingId);
      if (!meeting) return [];
      if (itemId) {
         const item = meeting.agenda.find(({ id }) => id === itemId);
         if (!item) return [];
         return data.attachments
            .filter((file) => isCommitteeFile(file, item.id))
            .map((file): FileNode => {
               const recording =
                  file.section === 'committee_record' ||
                  RECORDING.test(file.title);
               return {
                  key: `ic:${file.id}`,
                  name: file.title,
                  hint: '',
                  owner: personName(file.addedById) || FUND,
                  date: file.addedAt,
                  status: recording
                     ? { label: t('Запись'), tone: 'info' }
                     : file.kind === 'link'
                       ? { label: t('Ссылка'), tone: 'neutral' }
                       : undefined,
                  url: file.url,
                  subject: { type: 'ic_file', meeting, file },
               };
            });
      }
      const signed = meeting.protocol === 'signed' && meeting.protocolFile;
      return [
         ...(signed
            ? [
                 {
                    key: `pr:${meeting.id}`,
                    name: t('Протокол заседания'),
                    hint: '',
                    owner: personName(meeting.secretaryId) || FUND,
                    date: meeting.date,
                    status: {
                       label: tc(PROTOCOL_STATES.signed.label),
                       tone: PROTOCOL_STATES.signed.tone,
                    },
                    url: meeting.protocolFile,
                    subject: { type: 'protocol', meeting },
                 } satisfies FileNode,
              ]
            : []),
         ...meeting.agenda.map((item): FileNode => {
            const files = data.attachments.filter((file) =>
               isCommitteeFile(file, item.id),
            );
            return {
               key: `it:${item.id}`,
               name: item.title,
               hint: itemBadge(tc, meeting, item).label,
               owner: personName(item.speakerId) || FUND,
               date:
                  latest(files.map(({ addedAt }) => addedAt)) || meeting.date,
               folder: {
                  path: ['ic', meeting.id, item.id],
                  count: files.length,
               },
               url: '',
               subject: { type: 'folder' },
            };
         }),
      ];
   };

   const children = (path: FilePath): FileNode[] => {
      const [area, first = '', second = ''] = path;
      if (!area)
         return AREAS.map((id) => {
            const inner = children([id]);
            return {
               key: `area:${id}`,
               name: t(AREA_LABELS[id]),
               hint: t(AREA_HINTS[id]),
               owner: FUND,
               date: latest(filesUnder([id]).map(({ date }) => date)),
               folder: {
                  path: [id],
                  count: inner.length,
                  icon: { fund: Landmark, deals: Handshake, ic: Gavel }[id],
               },
               url: '',
               subject: { type: 'folder' },
            };
         });
      if (area === 'fund') {
         if (first) return fundLevel(first);
         return CATEGORIES.map((category) => {
            const inner = fundLevel(category);
            return {
               key: `fc:${category}`,
               name: t(CATEGORY_LABELS[category]),
               hint: '',
               owner: FUND,
               date: latest(inner.map(({ date }) => date)),
               folder: { path: ['fund', category], count: inner.length },
               url: '',
               subject: { type: 'folder' },
            };
         });
      }
      if (area === 'deals') {
         if (first) {
            const deal = dealOf(first);
            return deal ? dealLevel(deal, second) : [];
         }
         return deals.map((deal) => {
            const inner = dealLevel(deal, '');
            return {
               key: `d:${deal.id}`,
               name: deal.company,
               hint: stageName(deal.stage),
               owner: personName(deal.ownerId) || FUND,
               date: latest(
                  (deal.documents ?? []).map(
                     (document) => dealDocumentNode(deal, document).date,
                  ),
               ),
               folder: { path: ['deals', deal.id], count: inner.length },
               url: '',
               subject: { type: 'deal', deal },
            };
         });
      }
      if (area === 'ic') {
         if (first) return committeeLevel(first, second);
         return meetings.map((meeting) => ({
            key: `m:${meeting.id}`,
            name: meetingTitle(tc, meeting),
            hint: tc(MEETING_STATUS[meeting.status].label),
            owner: personName(meeting.secretaryId) || FUND,
            date: meeting.date,
            folder: {
               path: ['ic', meeting.id],
               count: committeeLevel(meeting.id, '').length,
            },
            url: '',
            subject: { type: 'meeting', meeting },
         }));
      }
      return [];
   };

   // every file below the folder, each with the folder it lies in
   const filesUnder = (path: FilePath): FileNode[] =>
      children(path).flatMap((node) =>
         node.folder
            ? filesUnder(node.folder.path)
            : [{ ...node, where: path }],
      );

   const crumbs = (path: FilePath): Crumb[] | null => {
      const [first, second] = path.slice(1);
      if (!path.length) return [];
      const area = AREAS.find((id) => id === path[0]);
      if (!area) return null;
      const top = [{ label: t(AREA_LABELS[area]), path: [area] }];
      if (!first) return top;
      if (area === 'fund') {
         const category = CATEGORIES.find((id) => id === first);
         return category && !second
            ? [...top, { label: t(CATEGORY_LABELS[category]), path }]
            : null;
      }
      if (area === 'deals') {
         const deal = dealOf(first);
         if (!deal) return null;
         const folders = deal.folders ?? [];
         // the folders from the top down to the open one
         const chain: DealFolder[] = [];
         for (
            let folder = folders.find(({ id }) => id === second);
            folder && !chain.includes(folder);
            folder = folders.find(({ id }) => id === folder?.parentId)
         )
            chain.unshift(folder);
         if (second && !chain.length) return null;
         return [
            ...top,
            { label: deal.company, path: ['deals', deal.id] },
            ...chain.map((folder) => ({
               label: folder.name,
               path: ['deals', deal.id, folder.id],
            })),
         ];
      }
      const meeting = meetingOf(first);
      if (!meeting) return null;
      const item = meeting.agenda.find(({ id }) => id === second);
      if (second && !item) return null;
      return [
         ...top,
         { label: meetingTitle(tc, meeting), path: ['ic', meeting.id] },
         ...(item ? [{ label: item.title, path }] : []),
      ];
   };

   return { children, filesUnder, crumbs };
};
