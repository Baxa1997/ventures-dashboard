/* What a section reads from ucode, kept in memory once read. A service reads
   its rows through a store, writes a change to ucode, then puts the changed
   value here, and the pages load again (useServiceData). Signing out, or in as
   somebody else, drops every store, so nobody sees the last person's data. */

export interface Store<T> {
   get: () => Promise<T>; // read once, then the kept value
   peek: () => T | undefined; // the kept value, if it has been read
   set: (apply: (state: T) => T) => T; // only after get has resolved
   reload: () => Promise<T>;
   subscribe: (listener: () => void) => () => void;
   notify: () => void;
}

const stores = new Set<{ clear: () => void }>();

export const clearStores = () => stores.forEach((store) => store.clear());

export const createStore = <T>(load: () => Promise<T>): Store<T> => {
   let value: T | undefined;
   let loading: Promise<T> | null = null;
   const listeners = new Set<() => void>();
   const notify = () => listeners.forEach((listener) => listener());

   const reload = () => {
      const current = load().then(
         (loaded) => {
            if (loading === current) value = loaded;
            return loaded;
         },
         (error: unknown) => {
            if (loading === current) loading = null; // the next read tries again
            throw error;
         },
      );
      loading = current;
      return current;
   };

   stores.add({
      clear: () => {
         value = undefined;
         loading = null;
      },
   });

   return {
      get: () =>
         value !== undefined ? Promise.resolve(value) : (loading ?? reload()),
      peek: () => value,
      set: (apply) => {
         if (value === undefined)
            throw new Error('The store has not been read yet');
         value = apply(value);
         notify();
         return value;
      },
      reload: () => reload().then((loaded) => (notify(), loaded)),
      subscribe: (listener) => {
         listeners.add(listener);
         return () => {
            listeners.delete(listener);
         };
      },
      notify,
   };
};

export const newId = () => crypto.randomUUID();
