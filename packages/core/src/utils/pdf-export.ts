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
