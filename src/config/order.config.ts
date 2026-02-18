import { OrderOptions } from "@vendure/core";
import { orderInterceptors } from "../interceptors";

export const orderOptions: OrderOptions = {
  orderItemsLimit: 999,
  orderInterceptors, // ← QUAN TRỌNG
};
