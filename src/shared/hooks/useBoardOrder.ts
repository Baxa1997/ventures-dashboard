import { useState } from 'react';

// The order of the cards inside each column of a board, as the person last
// dragged them: column → ids. Tasks and deals have no field for it in ucode,
// so it is kept in this browser.
export type BoardOrder = Record<string, string[]>;

// 'board' is Задачи's (its key from before Сделки had a board too)
const orderKey = (board: string, userId: string) =>
   `sqbv_${board}_order_${userId}`;

const readOrder = (board: string, userId: string): BoardOrder => {
   try {
      return JSON.parse(localStorage.getItem(orderKey(board, userId)) ?? '{}');
   } catch {
      return {};
   }
};

const useBoardOrder = (board: string, userId: string) => {
   const [order, setOrder] = useState(() => readOrder(board, userId));

   // the column's cards, top to bottom
   const setColumn = (column: string, ids: string[]) => {
      const next = { ...order, [column]: ids };
      setOrder(next);
      try {
         localStorage.setItem(orderKey(board, userId), JSON.stringify(next));
      } catch {
         // storage unavailable: the order lasts until the page is reloaded
      }
   };

   // a column's items in the order they were dragged to; the ones never
   // dragged keep their own order after them
   const arrange = <T extends { id: string }>(column: string, items: T[]) => {
      const ids = order[column] ?? [];
      const rank = new Map(ids.map((id, index) => [id, index]));
      return [...items].sort(
         (a, b) =>
            (rank.get(a.id) ?? ids.length) - (rank.get(b.id) ?? ids.length),
      );
   };

   // a card dropped at a place of a column it may already be in
   const place = (
      column: string,
      items: { id: string }[],
      id: string,
      index: number,
   ) => {
      const ids = items.map((item) => item.id).filter((item) => item !== id);
      ids.splice(index, 0, id);
      setColumn(column, ids);
   };

   return { arrange, place };
};

export default useBoardOrder;
