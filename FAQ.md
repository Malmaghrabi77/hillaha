# ❓ الأسئلة الشائعة والحل السريع (FAQ)

## 🚀 البدء السريع

### س: أين أبدأ؟
**ج:** ابدأ بالملفات التالية بهذا الترتيب:
1. اقرأ `DEEP_ANALYSIS_REPORT.md` - فهم شامل
2. اقرأ `WORK_PLAN.md` - خطة مفصلة
3. اقرأ `DAILY_TASKS.md` - خطوات يومية
4. ابدأ بتنفيذ المهام الحرجة

### س: كم من الوقت يستغرق المشروع؟
**ج:**
- **الحد الأدنى:** 3 أسابيع (فريق واحد، 40 ساعة/أسبوع)
- **الواقعي:** 4-5 أسابيع (مع اختبارات وإصلاحات)
- **آمن:** 6 أسابيع (مع هامش أمان)

---

## 🛠️ حل المشاكل التقنية

### س: Recharts لا يعمل
**ج:** جرب هذا:
```bash
# 1. تنظيف الـ cache
rm -rf node_modules apps/partner/node_modules
rm -rf .pnpm-store

# 2. إعادة التثبيت
pnpm install

# 3. تنظيف البناء
pnpm -C apps/partner clean
pnpm -C apps/partner build

# 4. التشغيل
pnpm dev:partner
```

### س: الرسم البياني فارغ
**ج:** افحص:
1. **البيانات موجودة؟**
   ```typescript
   console.log("monthlyRevenueData:", stats.monthlyRevenueData);
   console.log("length:", stats.monthlyRevenueData.length);
   ```

2. **الخادم يعيد بيانات؟**
   ```typescript
   // في التطوير أضف:
   console.log("Raw response:", monthOrders);
   ```

3. **الصيغة صحيحة؟**
   ```typescript
   // يجب أن تكون:
   { month: "يا", revenue: 1500 }
   // ليس:
   { x: "يا", y: 1500 }
   ```

### س: خطأ "Cannot find name"
**ج:**
- تأكد من أن `CHART_COLORS` معرّف قبل الاستخدام
- تأكد من import الـ components من recharts
- جرب: `npm install --save-exact recharts@3.7.0`

### س: الأداء بطيء
**ج:**
```typescript
// قلل عدد الطلبات:
.limit(1000)  // بدلاً من fetchingكل البيانات

// استخدم pagination:
let page = 0;
const pageSize = 100;
.range(page * pageSize, (page + 1) * pageSize)

// استخدم select محدد:
.select("id, name, email")  // بدلاً من select("*")
```

### س: رسالة: "RLS policy violation"
**ج:**
```typescript
// تأكد من:
1. المستخدم مسجل دخول
2. له الصلاحيات الكافية
3. الـ RLS policy صحيح في قاعدة البيانات

// اختبر:
const user = await supabase.auth.getUser();
console.log("Current user:", user);
console.log("User role:", user.user.user_metadata?.role);
```

---

## 📱 أسئلة حول التطبيقات

### س: تطبيق العميل بطيء جداً
**ج:**
```typescript
// 1. استخدم pagination
const [page, setPage] = useState(0);
const pageSize = 20;

// 2. lazy load الصور
import { Image } from 'react-native';
Image.prefetch(imageUrl); // pre-cache

// 3. استخدم memo
React.memo(PartnerCard)

// 4. حقق من console
- Warning عن renders
- Performance issues
```

### س: الدردشة بطيئة
**ج:**
```typescript
// المشكلة غالباً: subscription غير محقق
// الحل:
const subscription = supabase
  .channel(`messages:${roomId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages'
  }, (payload) => {
    setMessages(prev => [...prev, payload.new]);
  })
  .subscribe();

// لا تنسى cleanup:
return () => subscription.unsubscribe();
```

### س: الصور لا تظهر
**ج:**
```typescript
// تأكد من:
1. الـ URL صحيح
2. الصورة صيغة صحيحة (jpg, png)
3. الحجم معقول (< 5MB)

// جرب:
<Image
  source={{ uri: imageUrl }}
  style={{ width: 200, height: 200 }}
  onError={(e) => console.log("Image error:", e)}
/>
```

### س: المكالمات تعطل التطبيق
**ج:**
```typescript
// استخدم try-catch
try {
  await Communication.phonecall(phoneNumber, true);
} catch (error) {
  Alert.alert("خطأ", "لا يمكن إجراء المكالمة");
}

// أو استخدم permissions
import * as Permissions from 'expo-permissions';
const { status } = await Permissions.askAsync(Permissions.COMMUNICATION);
```

---

## 🗄️ أسئلة قاعدة البيانات

### س: كيفية إضافة جدول جديد؟
**ج:**
```sql
-- 1. إنشاء الجدول
CREATE TABLE IF NOT EXISTS new_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  data text,
  created_at timestamp DEFAULT now()
);

-- 2. تفعيل RLS
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- 3. إضافة سياسة
CREATE POLICY "users_read_own" ON new_table
  FOR SELECT USING (auth.uid() = user_id);

-- 4. الاختبار
SELECT * FROM new_table;
```

### س: كيفية حفظ البيانات؟
**ج:**
```typescript
// 1. Insert جديد
const { data, error } = await supabase
  .from('table_name')
  .insert([{ column1: value1, column2: value2 }])
  .select();

// 2. Update موجود
await supabase
  .from('table_name')
  .update({ column1: newValue })
  .eq('id', id);

// 3. Delete
await supabase
  .from('table_name')
  .delete()
  .eq('id', id);

// تحقق دائماً من الأخطاء
if (error) console.error("Error:", error.message);
```

### س: كيفية استعلام متقدم؟
**ج:**
```typescript
// مثال معقد:
const { data, error } = await supabase
  .from('orders')
  .select(`
    id,
    total,
    created_at,
    customer:customer_id(full_name, email),  // join
    partner:partner_id(name, rating)
  `)
  .eq('status', 'delivered')
  .gte('created_at', startDate)
  .lte('created_at', endDate)
  .order('created_at', { ascending: false })
  .limit(100);
```

### س: كيفية الاستشراف (Real-time)؟
**ج:**
```typescript
const channel = supabase
  .channel('messages-room-1')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `room_id=eq.1`
  }, (payload) => {
    console.log('New message:', payload.new);
    setMessages(prev => [...prev, payload.new]);
  })
  .subscribe();

// cleanup
return () => channel.unsubscribe();
```

---

## 🔒 أسئلة الأمان

### س: كيفية حماية البيانات الحساسة؟
**ج:**
1. **التشفير:**
   ```typescript
   import crypto from 'crypto';
   const encrypted = crypto.encrypt(data, key);
   ```

2. **التحقق:**
   ```typescript
   // تأكد من الصلاحيات
   if (user.role !== 'admin') throw new Error('Unauthorized');
   ```

3. **التجزئة:**
   ```typescript
   import bcrypt from 'bcrypt';
   const hashed = await bcrypt.hash(password, 10);
   ```

### س: كيفية منع SQL Injection؟
**ج:**
```typescript
// ❌ خطر:
const query = `SELECT * FROM users WHERE email = '${email}'`;

// ✅ آمن (Supabase يفعل هذا تلقائياً):
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('email', email);  // parameterized
```

### س: كيفية التحقق الثنائي؟
**ج:**
```typescript
// 1. إرسال OTP
const { data, error } = await supabase.auth.signInWithOtp({
  email: 'user@example.com',
});

// 2. التحقق
const { data, error } = await supabase.auth.verifyOtp({
  email: 'user@example.com',
  token: otpToken,
  type: 'email',
});
```

---

## 📊 أسئلة الأداء

### س: كيفية تحسين الأداء؟
**ج:**
```typescript
// 1. Caching
const cache = new Map();
function getCachedData(key) {
  if (cache.has(key)) return cache.get(key);
  const data = fetchData(key);
  cache.set(key, data);
  return data;
}

// 2. Debouncing
const debounce = (fn, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
};

// 3. Pagination
.range(0, 100)  // الأول 100
.range(100, 200) // التالي 100

// 4. Indexing
بقاعدة البيانات يجب:
CREATE INDEX idx_user_id ON orders(user_id);
```

### س: رصد الأخطاء الضائعة
**ج:**
```typescript
// استخدم Sentry أو ما شابه
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: process.env.NODE_ENV,
});

// كل الأخطاء ترسل تلقائياً
try {
  // code
} catch (error) {
  Sentry.captureException(error);
}
```

---

## 🚀 نصائح الإنتاج

### س: قبل الإطلاق تحقق من:
**ج:**
- [ ] جميع الـ API endpoints مختبرة
- [ ] معالجة الأخطاء موجودة
- [ ] الـ Logging في الإنتاج
- [ ] الـ Performance acceptable
- [ ] الأمان محقق (RLS, Auth, Validation)
- [ ] الـ UI responsive
- [ ] الـ Mobile compatible
- [ ] Load testing ناجح
- [ ] Backup متوفر
- [ ] Documentation كاملة

### س: كيفية Deploy؟
**ج:**
```bash
# 1. Partner/Admin App (Next.js -> Vercel)
vercel deploy apps/partner

# 2. Web App (Next.js -> Vercel)
vercel deploy apps/web

# 3. Customer App (React Native -> Expo)
eas build --platform android
eas build --platform ios

# 4. Database (Supabase)
# يتم تحديثها من console أو CLI
```

---

## 📞 التواصل والدعم

### كيفية طلب المساعدة؟
```
1. ابدأ بـ Google عن المشكلة
2. تفقد الـ official documentation
3. جرب الحل المقترح في هذا الملف
4. إذا استمرت المشكلة استفسر في Slack/Discord
5. أنشئ issue على GitHub
```

### الموارد المفيدة:
- Supabase Docs: https://supabase.com/docs
- React Native: https://reactnative.dev
- Next.js: https://nextjs.org
- Recharts: https://recharts.org
- Expo: https://expo.dev

---

**آخر تحديث:** 2026-03-25
