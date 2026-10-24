import attachments, { attachmentsAt } from '@shared/services/attachments';
import type { AttachmentPlace } from '@shared/types/attachments.types';
import useServiceData from './useServiceData';

const load = () => attachments.getAll();
const subscribe = (listener: () => void) => attachments.subscribe(listener);

// The links and files of one place on a card; empty until they are read.
const useAttachments = (place: AttachmentPlace) => {
   const all = useServiceData(load, subscribe);
   return all ? attachmentsAt(all, place) : [];
};

export default useAttachments;
