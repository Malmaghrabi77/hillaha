/**
 * Helper functions to prepare data for PDF report generation
 * These functions format data from Supabase into the structure required by pdf-export functions
 */

/**
 * Format orders data for Partner Financial Report
 */
export const formatPartnerFinancialReportData = (ordersData: any[], partnerInfo: { name: string; email?: string }) => {
  const monthlyMap = new Map<string, { revenue: number; orders: number }>();

  ordersData.forEach((order) => {
    if (order.status === "delivered") {
      const date = new Date(order.created_at);
      const monthKey = date.toLocaleDateString("ar-EG", { month: "long", year: "numeric" });

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { revenue: 0, orders: 0 });
      }

      const monthData = monthlyMap.get(monthKey)!;
      monthData.revenue += order.total || 0;
      monthData.orders += 1;
    }
  });

  const monthlyData = Array.from(monthlyMap.entries()).map(([month, data]) => ({
    month,
    revenue: data.revenue,
    orders: data.orders,
  }));

  const completedOrders = ordersData.filter((o) => o.status === "delivered").length;
  const cancelledOrders = ordersData.filter((o) => o.status === "cancelled").length;
  const totalRevenue = ordersData.reduce((sum, o) => sum + (o.status === "delivered" ? o.total || 0 : 0), 0);
  const averageOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0;

  return {
    name: partnerInfo.name,
    email: partnerInfo.email,
    totalRevenue,
    completedOrders,
    cancelledOrders,
    averageOrderValue,
    monthlyData,
  };
};

/**
 * Format driver data for Performance Report
 */
export const formatDriverPerformanceReportData = (driverData: any) => {
  const completedOrders = driverData.completed_orders || 0;
  const totalDeliveries = completedOrders + (driverData.cancelled_orders || 0);
  const acceptanceRate = totalDeliveries > 0 ? (completedOrders / totalDeliveries) * 100 : 0;

  return {
    name: driverData.full_name || "المندوب",
    completedOrders,
    cancelledOrders: driverData.cancelled_orders || 0,
    averageRating: driverData.rating || 4.5,
    totalEarnings: driverData.total_earnings || 0,
    averageDeliveryTime: 35, // Default value, should come from data if available
    acceptanceRate,
    monthlyOrders: [
      { month: "الشهر الماضي", orders: completedOrders, rating: driverData.rating || 4.5 },
    ],
  };
};

/**
 * Format platform data for Super Admin Report
 */
export const formatSuperAdminReportData = (platformStats: {
  totalOrders: number;
  totalRevenue: number;
  completedOrders: number;
  activePartners: number;
  activeDrivers: number;
  topPartners: any[];
}) => {
  const completionRate =
    platformStats.totalOrders > 0
      ? (platformStats.completedOrders / platformStats.totalOrders) * 100
      : 0;

  return {
    totalRevenue: platformStats.totalRevenue,
    totalOrders: platformStats.totalOrders,
    completedOrders: platformStats.completedOrders,
    activePartners: platformStats.activePartners,
    activeDrivers: platformStats.activeDrivers,
    activeRegionalManagers: 2, // Should come from actual data
    platformRating: 4.7,
    topPartners: (platformStats.topPartners || []).slice(0, 10).map((p: any) => ({
      name: p.name || "الشريك",
      revenue: p.total_revenue || 0,
      orders: p.total_orders || 0,
    })),
    monthlyRevenue: [
      { month: "الشهر الحالي", revenue: platformStats.totalRevenue, orders: platformStats.totalOrders },
    ],
    managerPerformance: [],
  };
};

/**
 * Format regional manager data for Manager Report
 */
export const formatRegionalManagerReportData = (managerData: {
  name: string;
  assignedPartners: any[];
  totalRevenue: number;
  totalOrders: number;
  completedOrders: number;
}) => {
  return {
    managerName: managerData.name,
    assignedPartnersCount: managerData.assignedPartners.length,
    totalRevenue: managerData.totalRevenue,
    totalOrders: managerData.totalOrders,
    completedOrders: managerData.completedOrders,
    averagePartnerRating: 4.5,
    topPartners: (managerData.assignedPartners || [])
      .sort((a: any, b: any) => (b.total_revenue || 0) - (a.total_revenue || 0))
      .slice(0, 5)
      .map((p: any) => ({
        name: p.name,
        revenue: p.total_revenue || 0,
        orders: p.total_orders || 0,
      })),
    monthlyRevenue: [
      { month: "الحالي", revenue: managerData.totalRevenue, orders: managerData.totalOrders },
    ],
  };
};

/**
 * Format driver earnings data for Earnings Report
 */
export const formatDriverEarningsReportData = (driverData: any) => {
  const totalEarnings = driverData.total_earnings || 0;
  const totalDeductions = driverData.deductions || 0;
  const netEarnings = totalEarnings - totalDeductions;

  return {
    driverName: driverData.full_name || "المندوب",
    totalEarnings,
    totalDeductions,
    netEarnings,
    monthlyEarnings: [
      {
        month: "الشهر الحالي",
        earnings: totalEarnings,
        deductions: totalDeductions,
        net: netEarnings,
      },
    ],
  };
};

/**
 * Format settlement data for Partner Settlement Report
 */
export const formatPartnerSettlementReportData = (payments: any[], partnerName: string) => {
  const totalSettled = payments
    .filter((p) => p.status === "settled")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalPending = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  return {
    partnerName,
    payments: (payments || []).map((p: any) => ({
      date: new Date(p.date).toLocaleDateString("ar-EG"),
      amount: p.amount || 0,
      status: p.status || "pending",
      period: p.period || "Unknown",
    })),
    totalSettled,
    totalPending,
  };
};
