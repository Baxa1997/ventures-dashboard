/* There is no backend yet. A store starts from a section's sample data and
   keeps what a person changes in this browser's localStorage; it is kept in
   memory as well, so the pages still work when storage is unavailable.
   Services read and change their data through a store and return promises, so
   their bodies can be replaced with API calls without changing the pages. */

export interface Store<T> {
   read: () => T;
   update: (apply: (state: T) => T) => T;
   subscribe: (listener: () => void) => () => void;
}

export const createStore = <T>(key: string, initial: () => T): Store<T> => {
   let cache: T | null = null;
   const listeners = new Set<() => void>();

   const read = () => {
      if (cache) return cache;
      try {
         const stored = localStorage.getItem(key);
         if (stored) {
            cache = JSON.parse(stored) as T;
            return cache;
         }
      } catch {
         // storage unavailable or unreadable: start from the sample data
      }
      cache = initial();
      return cache;
   };

   return {
      read,
      update: (apply) => {
         const next = apply(read());
         cache = next;
         try {
            localStorage.setItem(key, JSON.stringify(next));
         } catch {
            // storage unavailable: changes last until the page is reloaded
         }
         listeners.forEach((listener) => listener());
         return next;
      },
      subscribe: (listener) => {
         listeners.add(listener);
         return () => {
            listeners.delete(listener);
         };
      },
   };
};

export const newId = () => crypto.randomUUID();
