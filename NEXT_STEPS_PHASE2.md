# 📚 Next Steps - Phase 2 Implementation Guide

## 🎯 Quick Summary

You have successfully completed Phase 1:
- ✅ Design system (theme.ts + globals.css)
- ✅ 6 UI components library
- ✅ Zod validation system
- ✅ 3 Priority features built (Promotions, Reviews, Drivers)
- ✅ Database tables with RLS
- ✅ All pushed to GitHub

---

## 🔧 Phase 2: Real Data Connection (2-3 Days)

### Step 1: Update Dashboard with Real Data

**File to update:** `apps/partner/app/dashboard/page.tsx`

**Current state:** Mock data with hardcoded stats

**What to do:**
```typescript
// Add real-time query for today's orders
const getTodayStats = async (partnerId: string) => {
  return supabase
    .from('orders')
    .select('id, total, status')
    .eq('partner_id', partnerId)
    .gte('created_at', new Date().toISOString().split('T')[0]);
}

// Subscribe to real-time updates
supabase
  .channel('partner-orders')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' })
  .subscribe()
```

**Expected time:** 2-3 hours

---

### Step 2: Update Finance Page with Real Data

**File to update:** `apps/partner/app/dashboard/finance/page.tsx`

**Current state:** Hardcoded MONTHLY_DATA and TRANSACTIONS

**What to do:**
1. Create SQL function or computed query for monthly aggregation
2. Replace MONTHLY_DATA with real Supabase query
3. Replace TRANSACTIONS with real settlements data
4. Add Recharts for visualization

**SQL Example:**
```sql
-- Create function for monthly stats
CREATE OR REPLACE FUNCTION get_partner_monthly_stats(
  p_partner_id UUID,
  p_months INT DEFAULT 6
)
RETURNS TABLE (
  month TEXT,
  total_sales NUMERIC,
  commission NUMERIC,
  net_profit NUMERIC,
  order_count INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE_TRUNC('month', o.created_at)::TEXT as month,
    SUM(o.total)::NUMERIC as total_sales,
    SUM(o.order_commission_amount)::NUMERIC as commission,
    (SUM(o.total) - SUM(o.order_commission_amount))::NUMERIC as net_profit,
    COUNT(*)::INT as order_count
  FROM orders o
  WHERE o.partner_id = p_partner_id
    AND o.status IN ('delivered', 'paid')
    AND o.created_at >= NOW() - INTERVAL '1 month' * p_months
  GROUP BY DATE_TRUNC('month', o.created_at)
  ORDER BY DATE_TRUNC('month', o.created_at) DESC;
END;
$$ LANGUAGE plpgsql;
```

**Expected time:** 3-4 hours

---

### Step 3: Update Menu Page with Supabase

**File to update:** `apps/partner/app/dashboard/menu/page.tsx`

**Current state:** INITIAL_MENU mock array

**What to do:**
1. Create menu_items table (if not exists)
2. Query partne's menu items from Supabase
3. Implement Add/Edit/Delete persistence
4. Real-time menu updates

**Menu Items Table Schema:**
```sql
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id),

  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  category TEXT NOT NULL,
  emoji TEXT,
  available BOOLEAN DEFAULT true,

  image_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(partner_id, name)
);
```

**Expected time:** 2-3 hours

---

## 📊 Phase 3: Charts & Analytics (1-2 Days)

### Install Recharts

```bash
npm install recharts
```

### Add Charts to Finance Page

```typescript
import { LineChart, BarChart, PieChart } from 'recharts';

// Monthly Sales Chart
<BarChart data={monthlyData}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="month" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Bar dataKey="total_sales" fill="#8B5CF6" />
  <Bar dataKey="net_profit" fill="#10B981" />
</BarChart>

// Payment Method Distribution
<PieChart width={400} height={300}>
  <Pie data={paymentData} dataKey="value" />
  <Tooltip />
</PieChart>
```

### Create Analytics Page

**New file:** `apps/partner/app/dashboard/analytics/page.tsx`

**Metrics to include:**
- Peak order hours (bar chart)
- Top menu items (horizontal bar)
- Customer type distribution (pie)
- Weekly trend (line chart)
- Delivery performance (gauge)

**Expected time:** 2-3 hours

---

## 📄 Phase 4: PDF Export (1 Day)

### Install PDF Library

```bash
npm install jspdf @types/jspdf
```

### Create PDF Export Utility

**New file:** `packages/core/src/utils/pdf-export.ts`

```typescript
import jsPDF from 'jspdf';

export const generateFinanceReport = (data: FinanceData, partner: Partner) => {
  const pdf = new jsPDF();

  pdf.setFontSize(16);
  pdf.text(`تقرير المبيعات - ${partner.name}`, 10, 10);

  pdf.setFontSize(12);
  pdf.text(`من: ${data.startDate} إلى: ${data.endDate}`, 10, 20);

  // Add table
  const tableData = data.months.map(m => [
    m.month,
    m.total_sales,
    m.commission,
    m.net_profit
  ]);

  pdf.autoTable({
    head: [['الشهر', 'المبيعات', 'العمولة', 'الصافي']],
    body: tableData,
  });

  pdf.save(`report-${Date.now()}.pdf`);
};
```

**Add button to Finance page:**
```typescript
<Button
  variant="secondary"
  onClick={() => generateFinanceReport(monthlyData, partner)}
>
  📥 تحميل التقرير PDF
</Button>
```

**Expected time:** 2-3 hours

---

## 🧪 Testing Checklist

- [ ] Promotions CRUD works (create, read, update, delete)
- [ ] Reviews display and replies work
- [ ] Drivers list shows correct metrics
- [ ] Dashboard loads real order data
- [ ] Finance page shows real monthly stats
- [ ] Menu items persist to database
- [ ] Charts render correctly
- [ ] PDF export downloads
- [ ] Mobile responsive design works
- [ ] No console errors
- [ ] Real-time updates work
- [ ] Error handling shows messages

---

## 📱 Testing on Mobile

The design system should handle mobile. Test:
1. Grid layouts collapse to single column
2. Sidebar becomes hamburger menu (if implementated)
3. Forms are readable and usable
4. Buttons are tap-friendly
5. Charts are responsive

---

## 🐛 Common Issues & Fixes

### Issue: Supabase query returns null
**Solution:** Check RLS policies, ensure user has correct role

### Issue: Real-time updates not working
**Solution:** Ensure subscription channel matches table name

### Issue: Chart data looks wrong
**Solution:** Verify data transformation matches chart's expected format

### Issue: PDF missing Arabic text
**Solution:** Install correct font: `npm install jspdf-autotable`

---

## 📚 Files You'll Need to Read

1. `supabase/PARTNER_FEATURES_SETUP.sql` - Database schema reference
2. `packages/core/src/validators.ts` - Validation schemas
3. `apps/partner/app/styles/theme.ts` - Design system reference
4. `apps/partner/app/components/ui/index.ts` - Component API

---

## 🎨 Design Consistency Tips

When building Phase 2:
- Use `theme.colors.primary` for primary actions
- Use `theme.spacing[4]` for standard gaps
- Use `theme.borderRadius.md` for cards
- Use `theme.shadows.md` for depth
- Wrap numbers with `.toFixed(2)` for currency
- Use `.toLocaleDateString('ar-EG')` for dates
- Import `{ theme }` from `'../../styles/theme'`

---

## 🚀 After Phase 2

Once real data is connected:
1. User can see live order counts
2. Financial reports are accurate
3. Menu management is persistent
4. All three features (Promotions, Reviews, Drivers) are fully functional
5. Platform is ready for production use

---

## 📞 Quick Reference

**Design System:** `apps/partner/app/styles/theme.ts`
**Components:** `apps/partner/app/components/ui/`
**Validators:** `packages/core/src/validators.ts`
**Database:** `supabase/PARTNER_FEATURES_SETUP.sql`
**Progress:** `PROGRESS_DASHBOARD_UPGRADE.md`

---

**Estimated Total Time:** 8-10 days for all phases
**Current Completion:** Phase 1 (30%)
**Next Priority:** Real data connection

Good luck! 🎯
