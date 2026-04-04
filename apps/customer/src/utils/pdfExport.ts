import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * ✅ PDF Report Export
 * تصدير التقارير والفواتير والإحصائيات كـ PDF
 */

interface OrderReceipt {
  orderId: string;
  date: string;
  customer: {
    name: string;
    phone: string;
    email: string;
  };
  partner: {
    name: string;
    type: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  deliveryAddress: string;
  status: string;
  driver?: {
    name: string;
    phone: string;
  };
}

interface UserReport {
  period: 'monthly' | 'quarterly' | 'yearly';
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  loyaltyPoints: number;
  redeemedPoints: number;
  favoritePartners: Array<{ name: string; visits: number }>;
  monthlyBreakdown: Array<{
    month: string;
    orders: number;
    spent: number;
  }>;
}

// ✅ Generate PDF content (HTML)
const generateHTML = (content: string): string => {
  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: Arial, sans-serif;
          color: #1F1B2E;
          background: white;
          padding: 20px;
          direction: rtl;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #8B5CF6;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #8B5CF6;
          margin-bottom: 10px;
        }
        .section {
          margin-bottom: 20px;
        }
        .section-title {
          font-size: 16px;
          font-weight: bold;
          color: #8B5CF6;
          border-bottom: 1px solid #E7E3FF;
          padding-bottom: 8px;
          margin-bottom: 12px;
        }
        .row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        .row-label {
          font-weight: 600;
          color: #6B6480;
        }
        .row-value {
          color: #1F1B2E;
          font-weight: 600;
        }
        .total {
          background: #EDE9FE;
          padding: 12px;
          border-radius: 8px;
          font-size: 18px;
          font-weight: bold;
          color: #8B5CF6;
          margin-top: 15px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0;
        }
        th, td {
          padding: 10px;
          text-align: right;
          border-bottom: 1px solid #E7E3FF;
        }
        th {
          background: #F5F3FF;
          font-weight: bold;
          color: #8B5CF6;
        }
        .badge {
          display: inline-block;
          background: #34D399;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #E7E3FF;
          color: #6B6480;
          font-size: 12px;
        }
        .price {
          color: #8B5CF6;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      ${content}
      <div class="footer">
        <p>شكراً لاستخدامك تطبيق حلّها</p>
        <p>تم إنشاء هذا التقرير تلقائياً</p>
      </div>
    </body>
    </html>
  `;
};

// ✅ Generate Order Receipt HTML
const generateOrderReceiptHTML = (receipt: OrderReceipt): string => {
  const itemsHTML = receipt.items
    .map(
      item => `
        <tr>
          <td>${item.name}</td>
          <td>${item.quantity}</td>
          <td class="price">${(item.price * item.quantity).toFixed(2)} ج.م</td>
        </tr>
      `
    )
    .join('');

  const content = `
    <div class="header">
      <div class="logo">حلّها</div>
      <p>فاتورة الطلب</p>
    </div>

    <div class="section">
      <div class="section-title">معلومات الطلب</div>
      <div class="row">
        <span class="row-label">رقم الطلب:</span>
        <span class="row-value">#${receipt.orderId}</span>
      </div>
      <div class="row">
        <span class="row-label">التاريخ:</span>
        <span class="row-value">${receipt.date}</span>
      </div>
      <div class="row">
        <span class="row-label">الحالة:</span>
        <span class="row-value"><span class="badge">${receipt.status}</span></span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">معلومات المتجر</div>
      <div class="row">
        <span class="row-label">اسم المتجر:</span>
        <span class="row-value">${receipt.partner.name}</span>
      </div>
      <div class="row">
        <span class="row-label">نوع المتجر:</span>
        <span class="row-value">${receipt.partner.type}</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">البيانات الشخصية</div>
      <div class="row">
        <span class="row-label">الاسم:</span>
        <span class="row-value">${receipt.customer.name}</span>
      </div>
      <div class="row">
        <span class="row-label">الهاتف:</span>
        <span class="row-value">${receipt.customer.phone}</span>
      </div>
      <div class="row">
        <span class="row-label">عنوان التوصيل:</span>
        <span class="row-value">${receipt.deliveryAddress}</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">المنتجات</div>
      <table>
        <thead>
          <tr>
            <th>المنتج</th>
            <th>الكمية</th>
            <th>السعر</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="row">
        <span class="row-label">الإجمالي:</span>
        <span class="row-value price">${receipt.subtotal.toFixed(2)} ج.م</span>
      </div>
      ${
        receipt.discount > 0
          ? `<div class="row">
        <span class="row-label">الخصم:</span>
        <span class="row-value price" style="color: #34D399;">-${receipt.discount.toFixed(2)} ج.م</span>
      </div>`
          : ''
      }
      <div class="row">
        <span class="row-label">رسم التوصيل:</span>
        <span class="row-value">${receipt.deliveryFee.toFixed(2)} ج.م</span>
      </div>
      <div class="total">
        المجموع الكلي: ${receipt.total.toFixed(2)} ج.م
      </div>
    </div>

    ${
      receipt.driver
        ? `
    <div class="section">
      <div class="section-title">معلومات المندوب</div>
      <div class="row">
        <span class="row-label">اسم المندوب:</span>
        <span class="row-value">${receipt.driver.name}</span>
      </div>
      <div class="row">
        <span class="row-label">الهاتف:</span>
        <span class="row-value">${receipt.driver.phone}</span>
      </div>
    </div>
    `
        : ''
    }
  `;

  return generateHTML(content);
};

// ✅ Generate User Report HTML
const generateUserReportHTML = (report: UserReport): string => {
  const monthlyRowsHTML = report.monthlyBreakdown
    .map(
      month => `
        <tr>
          <td>${month.month}</td>
          <td>${month.orders}</td>
          <td class="price">${month.spent.toFixed(2)} ج.م</td>
        </tr>
      `
    )
    .join('');

  const favoritesHTML = report.favoritePartners
    .map(
      partner => `
        <tr>
          <td>${partner.name}</td>
          <td>${partner.visits}</td>
        </tr>
      `
    )
    .join('');

  const content = `
    <div class="header">
      <div class="logo">حلّها</div>
      <p>تقرير الإنفاق الشخصي</p>
    </div>

    <div class="section">
      <div class="section-title">الملخص العام</div>
      <div class="row">
        <span class="row-label">الفترة:</span>
        <span class="row-value">${report.period === 'monthly' ? 'شهري' : report.period === 'quarterly' ? 'ربع سنوي' : 'سنوي'}</span>
      </div>
      <div class="row">
        <span class="row-label">عدد الطلبات:</span>
        <span class="row-value">${report.totalOrders}</span>
      </div>
      <div class="row">
        <span class="row-label">إجمالي الإنفاق:</span>
        <span class="row-value price" style="color: #8B5CF6;">${report.totalSpent.toFixed(2)} ج.م</span>
      </div>
      <div class="row">
        <span class="row-label">متوسط قيمة الطلب:</span>
        <span class="row-value">${report.averageOrderValue.toFixed(2)} ج.م</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">نقاط الولاء</div>
      <div class="row">
        <span class="row-label">نقاط متاحة:</span>
        <span class="row-value price" style="color: #34D399;">${report.loyaltyPoints} نقطة</span>
      </div>
      <div class="row">
        <span class="row-label">نقاط مستخدمة:</span>
        <span class="row-value">${report.redeemedPoints} نقطة</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">الإنفاق حسب الشهر</div>
      <table>
        <thead>
          <tr>
            <th>الشهر</th>
            <th>الطلبات</th>
            <th>المبلغ</th>
          </tr>
        </thead>
        <tbody>
          ${monthlyRowsHTML}
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">أكثر المتاجر المفضلة</div>
      <table>
        <thead>
          <tr>
            <th>المتجر</th>
            <th>عدد الزيارات</th>
          </tr>
        </thead>
        <tbody>
          ${favoritesHTML}
        </tbody>
      </table>
    </div>
  `;

  return generateHTML(content);
};

// ✅ Save and Share PDF
export const exportPDF = async (html: string, filename: string) => {
  try {
    const pdfPath = `${FileSystem.documentDirectory}${filename}.pdf`;

    // Note: In production, use a library like react-native-html-to-pdf
    // For now, we'll create a placeholder that can be extended
    await FileSystem.writeAsStringAsync(pdfPath, html);

    // Share the file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(pdfPath, {
        mimeType: 'application/pdf',
        dialogTitle: 'مشاركة التقرير',
      });
    }

    return pdfPath;
  } catch (error) {
    throw error;
  }
};

// ✅ Public export functions
export const exportOrderReceipt = async (receipt: OrderReceipt) => {
  const html = generateOrderReceiptHTML(receipt);
  return exportPDF(html, `Receipt_${receipt.orderId}`);
};

export const exportUserReport = async (report: UserReport) => {
  const html = generateUserReportHTML(report);
  const periodNames = {
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly',
  };
  return exportPDF(html, `Report_${periodNames[report.period]}_${new Date().toISOString().split('T')[0]}`);
};

// ✅ Generate invoice items
export const generateInvoiceItems = (orders: any[]) => {
  return orders.map(order => ({
    orderId: order.id,
    date: new Date(order.created_at).toLocaleDateString('ar-EG'),
    partner: order.partner?.name || 'متجر',
    total: order.total,
    status: order.status,
  }));
};
