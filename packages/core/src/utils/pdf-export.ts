import jsPDF from "jspdf";
import "jspdf-autotable";

interface MonthlyData {
  month: string;
  total_sales: number;
  commission: number;
  net_profit: number;
  order_count: number;
}

interface PartnerInfo {
  name: string;
  email?: string;
  phone?: string;
}

/**
 * Generate a financial report PDF
 * Reports monthly sales, commissions, and profit
 */
export const generateFinanceReport = (
  monthlyData: MonthlyData[],
  partner: PartnerInfo,
  options?: {
    title?: string;
    includeCharts?: boolean;
  }
) => {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Set up right-to-left for Arabic
  (pdf as any).setLanguage("ar");

  // Title
  pdf.setFontSize(16);
  pdf.setFont("Arial", "bold");
  pdf.text(options?.title || "تقرير المبيعات الشهري", 200, 20, { align: "right" });

  // Partner Info
  pdf.setFontSize(11);
  pdf.setFont("Arial", "normal");
  pdf.text(`الشريك: ${partner.name}`, 200, 30, { align: "right" });
  if (partner.email) {
    pdf.text(`البريد: ${partner.email}`, 200, 37, { align: "right" });
  }
  pdf.text(`التاريخ: ${new Date().toLocaleDateString("ar-EG")}`, 200, 44, { align: "right" });

  // Summary Statistics
  const totalSales = monthlyData.reduce((sum, m) => sum + m.total_sales, 0);
  const totalCommission = monthlyData.reduce((sum, m) => sum + m.commission, 0);
  const netProfit = monthlyData.reduce((sum, m) => sum + m.net_profit, 0);
  const totalOrders = monthlyData.reduce((sum, m) => sum + m.order_count, 0);

  pdf.setFontSize(12);
  pdf.setFont("Arial", "bold");
  pdf.text("الإحصائيات الكلية", 200, 55, { align: "right" });

  pdf.setFont("Arial", "normal");
  pdf.setFontSize(10);
  const summaryY = 62;
  pdf.text(`إجمالي المبيعات: ${totalSales.toFixed(2)} ر.س`, 200, summaryY, { align: "right" });
  pdf.text(
    `إجمالي العمولات: ${totalCommission.toFixed(2)} ر.س`,
    200,
    summaryY + 7,
    { align: "right" }
  );
  pdf.text(
    `إجمالي الأرباح الصافية: ${netProfit.toFixed(2)} ر.س`,
    200,
    summaryY + 14,
    { align: "right" }
  );
  pdf.text(`إجمالي الطلبات: ${totalOrders}`, 200, summaryY + 21, { align: "right" });

  // Table Data
  const tableData = monthlyData.map((m) => [
    m.month,
    `${m.total_sales.toFixed(2)} ر.س`,
    `${m.commission.toFixed(2)} ر.س`,
    `${m.net_profit.toFixed(2)} ر.س`,
    m.order_count.toString(),
  ]);

  // Add Table
  (pdf as any).autoTable({
    head: [["الشهر", "المبيعات", "العمولات", "الصافي", "الطلبات"]],
    body: tableData,
    startY: summaryY + 30,
    margin: { right: 10, left: 10 },
    theme: "grid",
    styles: {
      font: "Arial",
      fontSize: 10,
      textColor: [31, 27, 46], // C.text color
      halign: "right",
    },
    headStyles: {
      fillColor: [139, 92, 246], // C.primary color
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [237, 233, 254], // C.primarySoft
    },
  });

  // Footer
  const pageCount = (pdf as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setFont("Arial", "normal");
    pdf.text(
      `صفحة ${i} من ${pageCount}`,
      105,
      pdf.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  // Save the PDF
  const filename = `finance-report-${new Date().toISOString().split("T")[0]}.pdf`;
  pdf.save(filename);
};

/**
 * Generate an order summary report
 */
export const generateOrderReport = (
  orders: Array<{
    id: string;
    customerName: string;
    total: number;
    status: string;
    createdAt: string;
    items: Array<{ name: string; quantity: number; price: number }>;
  }>,
  partner: PartnerInfo,
  period?: string
) => {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  (pdf as any).setLanguage("ar");

  // Title
  pdf.setFontSize(16);
  pdf.setFont("Arial", "bold");
  pdf.text("تقرير الطلبات", 200, 20, { align: "right" });

  // Partner & Period Info
  pdf.setFontSize(10);
  pdf.setFont("Arial", "normal");
  pdf.text(`الشريك: ${partner.name}`, 200, 28, { align: "right" });
  if (period) {
    pdf.text(`الفترة: ${period}`, 200, 35, { align: "right" });
  }
  pdf.text(`التاريخ: ${new Date().toLocaleDateString("ar-EG")}`, 200, 42, { align: "right" });

  // Summary
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const completedOrders = orders.filter((o) => o.status === "delivered").length;

  pdf.setFontSize(11);
  pdf.setFont("Arial", "bold");
  pdf.text("الملخص", 200, 52, { align: "right" });

  pdf.setFontSize(10);
  pdf.setFont("Arial", "normal");
  pdf.text(`إجمالي الطلبات: ${orders.length}`, 200, 60, { align: "right" });
  pdf.text(`الطلبات المُسلَّمة: ${completedOrders}`, 200, 67, { align: "right" });
  pdf.text(`إجمالي الإيرادات: ${totalRevenue.toFixed(2)} ر.س`, 200, 74, { align: "right" });

  // Orders Table
  const tableData = orders.slice(0, 20).map((o) => [
    o.id.substring(0, 8).toUpperCase(),
    o.customerName,
    `${o.total.toFixed(2)} ر.س`,
    o.status === "delivered"
      ? "مُسلَّم"
      : o.status === "pending"
        ? "قيد الانتظار"
        : "قيد التجهيز",
    new Date(o.createdAt).toLocaleDateString("ar-EG"),
  ]);

  (pdf as any).autoTable({
    head: [["رقم الطلب", "اسم العميل", "المبلغ", "الحالة", "التاريخ"]],
    body: tableData,
    startY: 82,
    margin: { right: 10, left: 10 },
    theme: "grid",
    styles: {
      font: "Arial",
      fontSize: 9,
      textColor: [31, 27, 46],
      halign: "right",
    },
    headStyles: {
      fillColor: [139, 92, 246],
      textColor: 255,
      fontStyle: "bold",
    },
  });

  const filename = `orders-report-${new Date().toISOString().split("T")[0]}.pdf`;
  pdf.save(filename);
};

/**
 * Generate daily sales summary
 */
export const generateDailySummary = (
  date: string,
  stats: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    completedOrders: number;
    cancelledOrders: number;
  },
  partner: PartnerInfo
) => {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  (pdf as any).setLanguage("ar");

  // Header
  pdf.setFontSize(16);
  pdf.setFont("Arial", "bold");
  pdf.text("ملخص اليومي", 200, 20, { align: "right" });

  // Top info
  pdf.setFontSize(11);
  pdf.setFont("Arial", "normal");
  pdf.text(`الشريك: ${partner.name}`, 200, 30, { align: "right" });
  pdf.text(`التاريخ: ${date}`, 200, 37, { align: "right" });

  // Stats Grid
  const statsY = 50;
  const boxWidth = 45;
  const boxHeight = 25;
  const boxGap = 55;

  const drawStatBox = (x: number, label: string, value: string) => {
    pdf.setDrawColor(139, 92, 246);
    pdf.rect(x - boxWidth, statsY, boxWidth, boxHeight, "S");
    pdf.setFont("Arial", "bold");
    pdf.setFontSize(9);
    pdf.text(label, x - boxWidth / 2, statsY + 6, { align: "center" });
    pdf.setFontSize(12);
    pdf.text(value, x - boxWidth / 2, statsY + 16, { align: "center" });
  };

  drawStatBox(200, "إجمالي الطلبات", stats.totalOrders.toString());
  drawStatBox(145, "الإيرادات", `${stats.totalRevenue.toFixed(0)} ر.س`);
  drawStatBox(90, "متوسط الطلب", `${stats.averageOrderValue.toFixed(0)} ر.س`);

  // Details
  pdf.setFontSize(10);
  pdf.setFont("Arial", "bold");
  pdf.text("التفاصيل", 200, 95, { align: "right" });

  pdf.setFont("Arial", "normal");
  pdf.setFontSize(9);
  const detailsY = 103;
  pdf.text(
    `الطلبات المُسلَّمة: ${stats.completedOrders}`,
    200,
    detailsY,
    { align: "right" }
  );
  pdf.text(`الطلبات المُلغاة: ${stats.cancelledOrders}`, 200, detailsY + 8, {
    align: "right",
  });
  pdf.text(`معدل الإتمام: ${((stats.completedOrders / stats.totalOrders) * 100).toFixed(1)}%`, 200, detailsY + 16, {
    align: "right",
  });

  const filename = `daily-summary-${date}.pdf`;
  pdf.save(filename);
};


/**
 * Generate a comprehensive financial report for a partner
 */
export const generatePartnerFinancialReport = (
  partnerId: string,
  partnerData: {
    name: string;
    email?: string;
    totalRevenue: number;
    completedOrders: number;
    cancelledOrders: number;
    averageOrderValue: number;
    monthlyData: { month: string; revenue: number; orders: number }[];
  },
  period: string = "Last 6 months"
) => {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  (pdf as any).setLanguage("ar");

  // Title
  pdf.setFontSize(16);
  pdf.setFont("Arial", "bold");
  pdf.text("التقرير المالي الشامل للشريك", 200, 20, { align: "right" });

  // Partner Info
  pdf.setFontSize(11);
  pdf.setFont("Arial", "normal");
  pdf.text(`الشريك: ${partnerData.name}`, 200, 30, { align: "right" });
  pdf.text(`الفترة: ${period}`, 200, 37, { align: "right" });
  pdf.text(`التاريخ: ${new Date().toLocaleDateString("ar-EG")}`, 200, 44, { align: "right" });

  // Summary Statistics
  pdf.setFontSize(12);
  pdf.setFont("Arial", "bold");
  pdf.text("الملخص المالي", 200, 55, { align: "right" });

  pdf.setFont("Arial", "normal");
  pdf.setFontSize(10);
  const summaryY = 62;
  pdf.text(`إجمالي الإيرادات: ${partnerData.totalRevenue.toFixed(0)} ج.م`, 200, summaryY, { align: "right" });
  pdf.text(`الطلبات المكتملة: ${partnerData.completedOrders}`, 200, summaryY + 7, { align: "right" });
  pdf.text(`الطلبات الملغاة: ${partnerData.cancelledOrders}`, 200, summaryY + 14, { align: "right" });
  pdf.text(`متوسط قيمة الطلب: ${partnerData.averageOrderValue.toFixed(0)} ج.م`, 200, summaryY + 21, { align: "right" });

  // Monthly breakdown table
  const tableData = partnerData.monthlyData.map((m) => [
    m.month,
    `${m.revenue.toFixed(0)} ج.م`,
    m.orders.toString(),
    `${(m.revenue / (m.orders || 1)).toFixed(0)} ج.م`,
  ]);

  (pdf as any).autoTable({
    head: [["الشهر", "الإيرادات", "عدد الطلبات", "متوسط الطلب"]],
    body: tableData,
    startY: summaryY + 30,
    margin: { right: 10, left: 10 },
    theme: "grid",
    styles: {
      font: "Arial",
      fontSize: 10,
      textColor: [31, 27, 46],
      halign: "right",
    },
    headStyles: {
      fillColor: [139, 92, 246],
      textColor: 255,
      fontStyle: "bold",
    },
  });

  const filename = `partner-financial-${partnerId.substring(0, 8)}-${new Date().toISOString().split("T")[0]}.pdf`;
  pdf.save(filename);
};

/**
 * Generate a settlement/payment report for a partner
 */
export const generatePartnerSettlementReport = (
  partnerId: string,
  settlementData: {
    partnerName: string;
    payments: {
      date: string;
      amount: number;
      status: "settled" | "pending";
      period: string;
    }[];
    totalSettled: number;
    totalPending: number;
  }
) => {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  (pdf as any).setLanguage("ar");

  // Title
  pdf.setFontSize(16);
  pdf.setFont("Arial", "bold");
  pdf.text("تقرير التسويات والدفعات", 200, 20, { align: "right" });

  // Header Info
  pdf.setFontSize(11);
  pdf.setFont("Arial", "normal");
  pdf.text(`الشريك: ${settlementData.partnerName}`, 200, 30, { align: "right" });
  pdf.text(`التاريخ: ${new Date().toLocaleDateString("ar-EG")}`, 200, 37, { align: "right" });

  // Summary
  pdf.setFontSize(12);
  pdf.setFont("Arial", "bold");
  pdf.text("ملخص الدفعات", 200, 48, { align: "right" });

  pdf.setFont("Arial", "normal");
  pdf.setFontSize(10);
  pdf.text(`إجمالي المسدد: ${settlementData.totalSettled.toFixed(0)} ج.م`, 200, 55, { align: "right" });
  pdf.text(`المعلق من الدفعات: ${settlementData.totalPending.toFixed(0)} ج.م`, 200, 62, { align: "right" });

  // Payments Table
  const tableData = settlementData.payments.map((p) => [
    p.period,
    `${p.amount.toFixed(0)} ج.م`,
    p.status === "settled" ? "مسدد" : "معلق",
    p.date,
  ]);

  (pdf as any).autoTable({
    head: [["الفترة", "المبلغ", "الحالة", "التاريخ"]],
    body: tableData,
    startY: 70,
    margin: { right: 10, left: 10 },
    theme: "grid",
    styles: {
      font: "Arial",
      fontSize: 10,
      textColor: [31, 27, 46],
      halign: "right",
    },
    headStyles: {
      fillColor: [139, 92, 246],
      textColor: 255,
      fontStyle: "bold",
    },
  });

  const filename = `settlement-${partnerId.substring(0, 8)}-${new Date().toISOString().split("T")[0]}.pdf`;
  pdf.save(filename);
};

/**
 * Generate a performance report for a driver
 */
export const generateDriverPerformanceReport = (
  driverId: string,
  driverData: {
    name: string;
    completedOrders: number;
    cancelledOrders: number;
    averageRating: number;
    totalEarnings: number;
    averageDeliveryTime: number;
    acceptanceRate: number;
    monthlyOrders: { month: string; orders: number; rating: number }[];
  },
  period: string = "Last 6 months"
) => {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  (pdf as any).setLanguage("ar");

  // Title
  pdf.setFontSize(16);
  pdf.setFont("Arial", "bold");
  pdf.text("تقرير أداء المندوب", 200, 20, { align: "right" });

  // Driver Info
  pdf.setFontSize(11);
  pdf.setFont("Arial", "normal");
  pdf.text(`المندوب: ${driverData.name}`, 200, 30, { align: "right" });
  pdf.text(`الفترة: ${period}`, 200, 37, { align: "right" });
  pdf.text(`التاريخ: ${new Date().toLocaleDateString("ar-EG")}`, 200, 44, { align: "right" });

  // Key Metrics
  pdf.setFontSize(12);
  pdf.setFont("Arial", "bold");
  pdf.text("المقاييس الرئيسية", 200, 55, { align: "right" });

  pdf.setFont("Arial", "normal");
  pdf.setFontSize(10);
  const metricsY = 62;
  pdf.text(`الطلبات المكتملة: ${driverData.completedOrders}`, 200, metricsY, { align: "right" });
  pdf.text(`متوسط التقييم: ${driverData.averageRating.toFixed(2)} ⭐`, 200, metricsY + 7, { align: "right" });
  pdf.text(`معدل القبول: ${driverData.acceptanceRate.toFixed(1)}%`, 200, metricsY + 14, { align: "right" });
  pdf.text(`متوسط وقت التسليم: ${driverData.averageDeliveryTime.toFixed(0)} دقيقة`, 200, metricsY + 21, { align: "right" });

  // Monthly performance table
  const tableData = driverData.monthlyOrders.map((m) => [
    m.month,
    m.orders.toString(),
    `${m.rating.toFixed(2)} ⭐`,
  ]);

  (pdf as any).autoTable({
    head: [["الشهر", "عدد الطلبات", "التقييم المتوسط"]],
    body: tableData,
    startY: metricsY + 30,
    margin: { right: 10, left: 10 },
    theme: "grid",
    styles: {
      font: "Arial",
      fontSize: 10,
      textColor: [31, 27, 46],
      halign: "right",
    },
    headStyles: {
      fillColor: [139, 92, 246],
      textColor: 255,
      fontStyle: "bold",
    },
  });

  const filename = `driver-performance-${driverId.substring(0, 8)}-${new Date().toISOString().split("T")[0]}.pdf`;
  pdf.save(filename);
};

/**
 * Generate an earnings report for a driver
 */
export const generateDriverEarningsReport = (
  driverId: string,
  earningsData: {
    driverName: string;
    totalEarnings: number;
    totalDeductions: number;
    netEarnings: number;
    monthlyEarnings: {
      month: string;
      earnings: number;
      deductions: number;
      net: number;
    }[];
  },
  period: string = "Last 6 months"
) => {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  (pdf as any).setLanguage("ar");

  // Title
  pdf.setFontSize(16);
  pdf.setFont("Arial", "bold");
  pdf.text("تقرير أرباح المندوب", 200, 20, { align: "right" });

  // Driver Info
  pdf.setFontSize(11);
  pdf.setFont("Arial", "normal");
  pdf.text(`المندوب: ${earningsData.driverName}`, 200, 30, { align: "right" });
  pdf.text(`الفترة: ${period}`, 200, 37, { align: "right" });
  pdf.text(`التاريخ: ${new Date().toLocaleDateString("ar-EG")}`, 200, 44, { align: "right" });

  // Summary
  pdf.setFontSize(12);
  pdf.setFont("Arial", "bold");
  pdf.text("ملخص الأرباح", 200, 55, { align: "right" });

  pdf.setFont("Arial", "normal");
  pdf.setFontSize(10);
  const summaryY = 62;
  pdf.text(`إجمالي الأرباح: ${earningsData.totalEarnings.toFixed(0)} ج.م`, 200, summaryY, { align: "right" });
  pdf.text(`إجمالي الخصومات: ${earningsData.totalDeductions.toFixed(0)} ج.م`, 200, summaryY + 7, { align: "right" });
  pdf.text(`الأرباح الصافية: ${earningsData.netEarnings.toFixed(0)} ج.م`, 200, summaryY + 14, { align: "right" });

  // Monthly earnings table
  const tableData = earningsData.monthlyEarnings.map((m) => [
    m.month,
    `${m.earnings.toFixed(0)} ج.م`,
    `${m.deductions.toFixed(0)} ج.م`,
    `${m.net.toFixed(0)} ج.م`,
  ]);

  (pdf as any).autoTable({
    head: [["الشهر", "الأرباح", "الخصومات", "الصافي"]],
    body: tableData,
    startY: summaryY + 24,
    margin: { right: 10, left: 10 },
    theme: "grid",
    styles: {
      font: "Arial",
      fontSize: 10,
      textColor: [31, 27, 46],
      halign: "right",
    },
    headStyles: {
      fillColor: [139, 92, 246],
      textColor: 255,
      fontStyle: "bold",
    },
  });

  const filename = `earnings-${driverId.substring(0, 8)}-${new Date().toISOString().split("T")[0]}.pdf`;
  pdf.save(filename);
};

/**
 * Generate a comprehensive report for a regional manager
 */
export const generateRegionalManagerReport = (
  managerId: string,
  managerData: {
    managerName: string;
    assignedPartnersCount: number;
    totalRevenue: number;
    totalOrders: number;
    completedOrders: number;
    averagePartnerRating: number;
    topPartners: { name: string; revenue: number; orders: number }[];
    monthlyRevenue: { month: string; revenue: number; orders: number }[];
  },
  period: string = "Last 6 months"
) => {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  (pdf as any).setLanguage("ar");

  // Title
  pdf.setFontSize(16);
  pdf.setFont("Arial", "bold");
  pdf.text("التقرير الشامل للمدير الإقليمي", 200, 20, { align: "right" });

  // Manager Info
  pdf.setFontSize(11);
  pdf.setFont("Arial", "normal");
  pdf.text(`المدير: ${managerData.managerName}`, 200, 30, { align: "right" });
  pdf.text(`الفترة: ${period}`, 200, 37, { align: "right" });
  pdf.text(`التاريخ: ${new Date().toLocaleDateString("ar-EG")}`, 200, 44, { align: "right" });

  // Performance Metrics
  pdf.setFontSize(12);
  pdf.setFont("Arial", "bold");
  pdf.text("مؤشرات الأداء", 200, 55, { align: "right" });

  pdf.setFont("Arial", "normal");
  pdf.setFontSize(10);
  const metricsY = 62;
  pdf.text(`عدد الشركاء المسندة: ${managerData.assignedPartnersCount}`, 200, metricsY, { align: "right" });
  pdf.text(`إجمالي الإيرادات: ${managerData.totalRevenue.toFixed(0)} ج.م`, 200, metricsY + 7, { align: "right" });
  pdf.text(`إجمالي الطلبات: ${managerData.totalOrders}`, 200, metricsY + 14, { align: "right" });
  pdf.text(`متوسط تقييم الشركاء: ${managerData.averagePartnerRating.toFixed(2)}`, 200, metricsY + 21, { align: "right" });

  // Top Partners table
  if (managerData.topPartners.length > 0) {
    pdf.setFontSize(11);
    pdf.setFont("Arial", "bold");
    pdf.text("أفضل 5 شركاء", 200, metricsY + 35, { align: "right" });

    const topPartnersData = managerData.topPartners.slice(0, 5).map((p) => [
      p.name,
      `${p.revenue.toFixed(0)} ج.م`,
      p.orders.toString(),
    ]);

    (pdf as any).autoTable({
      head: [["اسم الشريك", "الإيرادات", "الطلبات"]],
      body: topPartnersData,
      startY: metricsY + 41,
      margin: { right: 10, left: 10 },
      theme: "grid",
      styles: {
        font: "Arial",
        fontSize: 10,
        textColor: [31, 27, 46],
        halign: "right",
      },
      headStyles: {
        fillColor: [139, 92, 246],
        textColor: 255,
        fontStyle: "bold",
      },
    });
  }

  const filename = `regional-manager-${managerId.substring(0, 8)}-${new Date().toISOString().split("T")[0]}.pdf`;
  pdf.save(filename);
};

/**
 * Generate a comprehensive platform report for super admin
 */
export const generateSuperAdminReport = (
  platformData: {
    totalRevenue: number;
    totalOrders: number;
    completedOrders: number;
    activePartners: number;
    activeDrivers: number;
    activeRegionalManagers: number;
    platformRating: number;
    topPartners: { name: string; revenue: number; orders: number }[];
    monthlyRevenue: { month: string; revenue: number; orders: number }[];
    managerPerformance: { name: string; partnerCount: number; revenue: number }[];
  },
  period: string = "Last 6 months"
) => {
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  (pdf as any).setLanguage("ar");

  // Title
  pdf.setFontSize(18);
  pdf.setFont("Arial", "bold");
  pdf.text("تقرير منصة التوصيل الشامل", 270, 20, { align: "right" });

  // Report Info
  pdf.setFontSize(11);
  pdf.setFont("Arial", "normal");
  pdf.text(`الفترة: ${period}`, 270, 30, { align: "right" });
  pdf.text(`التاريخ: ${new Date().toLocaleDateString("ar-EG")}`, 270, 37, { align: "right" });

  // Key Performance Indicators
  pdf.setFontSize(12);
  pdf.setFont("Arial", "bold");
  pdf.text("مؤشرات الأداء الرئيسية (KPIs)", 270, 50, { align: "right" });

  pdf.setFont("Arial", "normal");
  pdf.setFontSize(10);
  const kpiY = 57;
  pdf.text(`إجمالي إيرادات المنصة: ${platformData.totalRevenue.toFixed(0)} ج.م`, 270, kpiY, { align: "right" });
  pdf.text(`إجمالي الطلبات: ${platformData.totalOrders}`, 270, kpiY + 7, { align: "right" });
  pdf.text(`معدل الإتمام: ${platformData.completedOrders > 0 ? ((platformData.completedOrders / platformData.totalOrders) * 100).toFixed(1) : 0}%`, 270, kpiY + 14, { align: "right" });
  pdf.text(`الشركاء النشطين: ${platformData.activePartners}`, 270, kpiY + 21, { align: "right" });
  pdf.text(`المندوبين النشطين: ${platformData.activeDrivers}`, 270, kpiY + 28, { align: "right" });
  pdf.text(`متوسط تقييم المنصة: ${platformData.platformRating.toFixed(2)} ⭐`, 270, kpiY + 35, { align: "right" });

  // Top Partners table
  if (platformData.topPartners.length > 0) {
    const topPartnersData = platformData.topPartners.slice(0, 10).map((p, i) => [
      (i + 1).toString(),
      p.name,
      `${p.revenue.toFixed(0)} ج.م`,
      p.orders.toString(),
    ]);

    (pdf as any).autoTable({
      head: [["#", "اسم الشريك", "الإيرادات", "الطلبات"]],
      body: topPartnersData,
      startY: kpiY + 45,
      margin: { right: 10, left: 10 },
      theme: "grid",
      styles: {
        font: "Arial",
        fontSize: 9,
        textColor: [31, 27, 46],
        halign: "right",
      },
      headStyles: {
        fillColor: [139, 92, 246],
        textColor: 255,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { halign: "center" },
      },
    });
  }

  const filename = `platform-report-${new Date().toISOString().split("T")[0]}.pdf`;
  pdf.save(filename);
};
