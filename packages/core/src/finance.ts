import { DEFAULT_MONTHLY_COMMISSION_RULE } from "./types";
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function getMonthlyCommissionRate(completedOrdersThisMonth: number) {
  const r = DEFAULT_MONTHLY_COMMISSION_RULE;
  return completedOrdersThisMonth >= r.targetCompletedOrders ? r.afterTargetRate : r.baseRate;
}

export function calcDeliverySplit(deliveryFee: number, appRate: number) {
  const appCommission = round2(deliveryFee * appRate);
  const driverEarnings = round2(deliveryFee - appCommission);
  return { appCommission, driverEarnings };
}
