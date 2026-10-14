import { useServiceData } from '@shared/hooks';
import contracts from '../services';

const load = () => contracts.getContracts();
const subscribe = (listener: () => void) => contracts.subscribe(listener);

export const useContracts = () => useServiceData(load, subscribe);
