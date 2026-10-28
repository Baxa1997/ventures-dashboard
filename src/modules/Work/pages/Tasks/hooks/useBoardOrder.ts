import { useState } from 'react';

// The order of the cards inside each column of the board, as the person last
// dragged them: status → task ids. Our tasks have no field for it in ucode,
// so it is kept in this browser.
export type BoardOrder = Record<string, string[]>;

const orderKey = (userId: string) => `sqbv_board_order_${userId}`;

const readOrder = (userId: string): BoardOrder => {
   try {
      return JSON.parse(localStorage.getItem(orderKey(userId)) ?? '{}');
   } catch {
      return {};
   }
};

const useBoardOrder = (userId: string) => {
   const [order, setOrder] = useState(() => readOrder(userId));

   // the column's cards, top to bottom
   const setColumn = (status: string, ids: string[]) => {
      const next = { ...order, [status]: ids };
      setOrder(next);
      try {
         localStorage.setItem(orderKey(userId), JSON.stringify(next));
      } catch {
         // storage unavailable: the order lasts until the page is reloaded
      }
   };

   return { order, setColumn };
};

export default useBoardOrder;
