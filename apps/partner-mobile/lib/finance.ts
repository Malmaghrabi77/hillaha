export type MonthlyCommissionRule = {
  baseRate: number;
  targetCompletedOrders: number;
  afterTargetRate: number;
  resetsMonthly: boolean;
};

export const DEFAULT_MONTHLY_COMMISSION_RULE: MonthlyCommissionRule = {
  baseRate: 0.15,
  targetCompletedOrders: 1000,
  afterTargetRate: 0.12,
  resetsMonthly: true,
};

export function getMonthlyCommissionRate(completedOrdersThisMonth: number) {
  const r = DEFAULT_MONTHLY_COMMISSION_RULE;
  return completedOrdersThisMonth >= r.targetCompletedOrders
    ? r.afterTargetRate
    : r.baseRate;
}
