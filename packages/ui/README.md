# @hillaha/ui

مكتبة المكونات المشتركة لجميع تطبيقات حلّها (React Native + React Web).

## المكونات

- **Button** — زر قياسي
- **Input** — حقل إدخال نص
- **Card** — بطاقة محتوى
- **Modal** — نافذة منفثقة
- **Loading** — مؤشر التحميل
- **Badge** — علامة/ملصق

## نمط الألوان الموحد

تستخدم جميع التطبيقات نفس لوحة الألوان:

```typescript
const COLORS = {
  primary: "#7C3AED",      // بنفسجي
  primarySoft: "#EDE9FE",
  secondary: "#EC4899",    // وردي
  success: "#34D399",      // أخضر
  warning: "#F59E0B",      // برتقالي
  danger: "#EF4444",       // أحمر
  bg: "#FAFAFF",           // خلفية
  surface: "#FFFFFF",      // سطح
  border: "#E5E7EB",       // خط حدود
  text: "#1F2937",         // نص
  textMuted: "#6B7280",    // نص خافت
};
```

## الاستخدام

### React Native (Expo)

```typescript
import { Button, Card } from "@hillaha/ui";

export default function Screen() {
  return (
    <Card>
      <Button onPress={() => {}}>اضغط هنا</Button>
    </Card>
  );
}
```

### React (Next.js)

```typescript
import { Button, Input } from "@hillaha/ui";

export default function Page() {
  return <Button onClick={() => {}}>Click me</Button>;
}
```

## المساهمة

عند إضافة مكون جديد:

1. استخدم التصميم النموذجي والألوان
2. أضِف نوع TypeScript كامل
3. اختبر على كل من RN و Web
4. وثّق استخدام المكون

---

**الهدف:** توحيد التجربة البصرية عبر جميع منصات حلّها.
