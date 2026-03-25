# 🗓️ جدول المهام التفصيلي اليومي

## 📅 الأسبوع الأول - الأيام من السبت إلى الأربعاء

### ✅ **يوم السبت: إصلاح الرسوم البيانية (أولوية قصوى)**

#### الساعة 9:00 - 9:30 | **إضافة Recharts Imports**
```bash
cd apps/partner
npm install recharts
```

**الملف:** `apps/partner/app/admin/page.tsx` - السطر 1-10

أضف بعد السطر 5:
```typescript
import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";

const CHART_COLORS = ["#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#3B82F6"];
```

#### الساعة 9:30 - 10:00 | **استبدال رسم الإيرادات**
**الملف:** `page.tsx` - السطور 672-684

**البحث عن:**
```html
<ChartSection title="📈 اتجاه الإيرادات (6 أشهر)">
  <div style={{
    padding: 32,
    backgroundColor: C.surfaceLight,
    ...
  }}>
    <p style={{ margin: 0 }}>📊 الرسم البياني سيتم تحميله على العميل</p>
```

**الاستبدال ب:**
```typescript
<ChartSection title="📈 اتجاه الإيرادات (6 أشهر)">
  {stats.monthlyRevenueData.length > 0 ? (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={stats.monthlyRevenueData}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
        <XAxis dataKey="month" stroke={C.textMuted} />
        <YAxis stroke={C.textMuted} />
        <Tooltip
          formatter={(value) => `${value.toLocaleString()} ج.م`}
          contentStyle={{ background: C.surface, border: `1px solid ${C.border}` }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke={C.primary}
          strokeWidth={2}
          dot={{ fill: C.primary, r: 4 }}
          name="الإيرادات"
        />
      </LineChart>
    </ResponsiveContainer>
  ) : (
    <div style={{ padding: 32, textAlign: "center", color: C.textMuted }}>
      📊 لا توجد بيانات بعد
    </div>
  )}
</ChartSection>
```

#### الساعة 10:00 - 10:15 | **استبدال رسم الطلبات**
**الملف:** `page.tsx` - السطور 687-699

**الاستبدال ب:**
```typescript
<ChartSection title="📊 توزيع حالات الطلبات">
  {stats.orderDistributionData.length > 0 ? (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={stats.orderDistributionData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, value }) => `${name}: ${value}`}
          outerRadius={80}
          fill={C.primary}
          dataKey="value"
        >
          {stats.orderDistributionData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % 5]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `${value} طلب`} />
      </PieChart>
    </ResponsiveContainer>
  ) : (
    <div style={{ padding: 32, textAlign: "center", color: C.textMuted }}>
      📊 لا توجد بيانات طلبات بعد
    </div>
  )}
</ChartSection>
```

---

### ✅ **يوم الأحد: تحميل بيانات المديرين**

#### الساعة 9:00 - 9:20 | **كتابة دالة تحميل البيانات**
**الملف:** `apps/partner/app/admin/page.tsx` - ابحث عن السطر 340-350

**البحث عن:**
```typescript
// Recent admin actions (only for Super Admin)
let actionsWithNames: any[] = [];
```

**أضف قبلها (جريء جداً):**
```typescript
// Manager performance data - FILLED IN (was TODO)
let managerPerformanceData: { name: string; revenue: number; partners: number }[] = [];
if (auth.isSuperAdmin) {
  try {
    const { data: assignments } = await (supabase
      .from("admin_assignments") as any)
      .select(`
        admin_id,
        partner_id,
        admin_profiles:profiles!admin_assignments_admin_id_fkey(full_name)
      `)
      .eq("status", "active");

    const managerMap = new Map<string, { name: string; revenue: number; count: number }>();

    if (assignments) {
      for (const assignment of (assignments as any[])) {
        const adminId = assignment.admin_id;
        const adminName = assignment.admin_profiles?.full_name || "غير معروف";

        if (!managerMap.has(adminId)) {
          managerMap.set(adminId, { name: adminName, revenue: 0, count: 0 });
        }

        const manager = managerMap.get(adminId)!;
        manager.count++;

        // Get revenue for this partner
        const { data: partnerOrders } = await (supabase
          .from("orders") as any)
          .select("total")
          .eq("partner_id", assignment.partner_id)
          .eq("status", "delivered");

        const partnerRevenue = ((partnerOrders as any[]) || []).reduce(
          (sum, order) => sum + (order.total || 0),
          0
        );

        manager.revenue += partnerRevenue;
      }
    }

    managerPerformanceData = Array.from(managerMap.entries())
      .map(([_, manager]) => ({
        name: manager.name,
        revenue: Math.round(manager.revenue),
        partners: manager.count,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  } catch (error) {
    console.error("Error loading manager performance:", error);
  }
}
```

#### الساعة 9:20 - 9:35 | **تحديث setStats**
**الملف:** `page.tsx` - ابحث عن `setStats({`

**استبدل:**
```typescript
managerPerformanceData: [], // TODO: Load from admin_assignments
```

**ب:**
```typescript
managerPerformanceData,
```

#### الساعة 9:35 - 10:00 | **إضافة رسم بياني المديرين**
**الملف:** `page.tsx` - بعد السطر 755 (أضف هذا الكود الجديد)

```typescript
{/* Charts Section */}
{stats.managerPerformanceData.length > 0 && (
  <ChartSection title="👔 أداء المديرين الإقليميين (أفضل 5)">
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={stats.managerPerformanceData}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke={C.textMuted} />
        <YAxis stroke={C.textMuted} />
        <Tooltip
          contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8 }}
          formatter={(value) => value.toLocaleString()}
        />
        <Legend />
        <Bar dataKey="revenue" fill={C.primary} name="الإيرادات (ج.م)" />
        <Bar dataKey="partners" fill={C.success} name="عدد الشركاء" />
      </BarChart>
    </ResponsiveContainer>
  </ChartSection>
)}
```

---

### ✅ **يوم الاثنين: الاختبار والتصحيح**

#### الساعة 9:00 - 10:00 | **اختبار الرسوم البيانية**
```bash
cd apps/partner
npm run dev
```

**تحقق من:**
- ✅ رسم الإيرادات يعرض بشكل صحيح
- ✅ رسم توزيع الطلبات يعرض البيانات
- ✅ رسم بياني المديرين يظهر أفضل 5 مديرين
- ✅ عدم وجود أخطاء في console
- ✅ الأداء سلس

#### الساعة 10:00 - 11:30 | **حل المشاكل**

**إذا حدثت مشاكل:**

1. **خطأ: "Cannot find module 'recharts'"**
   ```bash
   npm install recharts recharts@3.7.0
   npm run dev
   ```

2. **الرسم البياني فارغ**
   - تحقق من `console.log(stats.monthlyRevenueData)`
   - تأكد من أن البيانات تحميل صحيح
   - تحقق من طول البيانات > 0

3. **الأداء بطيء**
   - قلل عدد الطلبات في الاستعلام
   - أضف `head: true` للـ count queries

#### الساعة 11:30 - 12:00 | **الاختبار الشامل**
- اختبر كل الأدوار (سوبر أدمن، مدير إقليمي)
- تحقق من التنسيق
- اختبر استجابة الأجهزة المختلفة

---

### ✅ **يوم الثلاثاء: تحسينات الأداء**

#### الساعة 9:00 - 11:00 | **إضافة تصفية البيانات**

**الملف:** `apps/partner/app/admin/page.tsx` - أضف بعد `const loadStats`

```typescript
const [dateRange, setDateRange] = useState({
  from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  to: new Date()
});

const filteredStats = useMemo(() => {
  // تصفية الإحصائيات حسب التاريخ
  return stats; // TODO: filter by dateRange
}, [stats, dateRange]);
```

#### الساعة 11:00 - 12:30 | **إضافة تحديث تلقائي**

```typescript
useEffect(() => {
  const interval = setInterval(() => {
    loadStats(); // تحديث كل 30 ثانية
  }, 30000);

  return () => clearInterval(interval);
}, []);
```

#### الساعة 12:30 - 13:00 | **إضافة زر تحديث يدوي**

```typescript
<button
  onClick={loadStats}
  style={{ padding: "8px 16px", borderRadius: 8, background: C.primary, color: "white" }}
>
  🔄 تحديث الآن
</button>
```

---

### ✅ **يوم الأربعاء: التعديلات النهائية والاختبار**

#### الساعة 9:00 - 10:00 | **اختبار الأدوار المختلفة**
```
[ ] اختبر كسوبر أدمن
[ ] اختبر كمدير إقليمي
[ ] اختبر كأدمن عادي
```

#### الساعة 10:00 - 11:00 | **اختبار الأداء والحمل**
```bash
# اختبر مع بيانات كثيرة
curl -X POST http://localhost:3000/admin -H "Authorization: Bearer TOKEN"
```

#### الساعة 11:00 - 12:00 | **الوثائق والتعليقات**
- أضف تعليقات على الكود
- أنشئ ملف README
- وثق أي تغييرات

#### الساعة 12:00 - 13:00 | **Commit و Push**
```bash
git add .
git commit -m "feat: implement recharts dashboard with manager performance analytics"
git push origin main
```

---

## 📊 Checklist للأسبوع الأول

- [ ] إضافة Recharts library
- [ ] استبدال رسم الإيرادات
- [ ] استبدال رسم توزيع الطلبات
- [ ] كتابة دالة تحميل بيانات المديرين
- [ ] إضافة رسم بياني المديرين
- [ ] اختبار على جميع الأدوار
- [ ] فحص الأداء
- [ ] إضافة Refresh button
- [ ] معالجة الأخطاء
- [ ] التوثيق والـ comments

---

## ⏰ Checklist للأسابيع 2-4

### الأسبوع الثاني: تطبيق العميل
- [ ] تحسينات الأداء (pagination, lazy loading)
- [ ] نظام الاشتراكات
- [ ] نظام الإحالات
- [ ] Warp mode
- [ ] إشعارات الدفع
- [ ] الرسوم المتحركة

### الأسبوع الثالث: تطبيق المندوب
- [ ] تكامل Google Maps
- [ ] بث الموقع الحي
- [ ] نظام التحقق من الوصول
- [ ] الدردشة مع العميل
- [ ] لوحة الإحصائيات
- [ ] نظام التقييمات

### الأسبوع الرابع: تطبيق الشركاء
- [ ] إدارة المنتجات
- [ ] إدارة المخزون
- [ ] لوحة الشريك
- [ ] إدارة الموظفين
- [ ] نظام الدعم
- [ ] الإعدادات المتقدمة

---

**تم إعداده:** 2026-03-25
**الحالة:** جاهز للبدء الفوري
