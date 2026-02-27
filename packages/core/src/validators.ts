import { z } from 'zod';

/**
 * Validation schemas for Partner Dashboard
 * Using Zod for runtime type checking and validation
 */

// ============= MENU VALIDATORS =============

export const MenuItemSchema = z.object({
  name: z.string().min(2, 'اسم المنتج يجب أن يكون 2 أحرف على الأقل').max(100, 'اسم المنتج طويل جداً'),
  description: z.string().max(300, 'الوصف طويل جداً'),
  price: z.number().positive('السعر يجب أن يكون رقماً موجباً'),
  category: z.string().min(1, 'اختر فئة'),
  emoji: z.string().optional(),
  available: z.boolean().default(true),
});

export type MenuItemType = z.infer<typeof MenuItemSchema>;

// ============= PROMOTION VALIDATORS =============

export const PromotionSchema = z.object({
  name: z.string().min(2, 'اسم العرض يجب أن يكون 2 أحرف على الأقل').max(100),
  description: z.string().optional(),
  discountType: z.enum(['percentage', 'fixed'], {
    errorMap: () => ({ message: 'اختر نوع الخصم' }),
  }),
  discountValue: z.number().positive('قيمة الخصم يجب أن تكون موجبة'),
  minOrderValue: z.number().nonnegative('الحد الأدنى يجب أن يكون 0 أو أكثر'),
  startDate: z.string().min(1, 'اختر تاريخ البدء'),
  endDate: z.string().min(1, 'اختر تاريخ الانتهاء'),
  couponCode: z.string().optional(),
  applyToAll: z.boolean().default(true),
  productIds: z.array(z.string()).optional(),
  maxUses: z.number().positive('الحد الأقصى للاستخدام يجب أن يكون رقماً موجباً'),
  active: z.boolean().default(true),
}).refine(
  (data) => new Date(data.startDate) < new Date(data.endDate),
  { message: 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء', path: ['endDate'] }
);

export type PromotionType = z.infer<typeof PromotionSchema>;

// ============= REVIEW VALIDATORS =============

export const ReviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().min(2, 'التعليق يجب أن يكون 2 أحرف على الأقل').max(500),
});

export type ReviewType = z.infer<typeof ReviewSchema>;

export const ReviewReplySchema = z.object({
  reply: z.string().min(2, 'الرد يجب أن يكون 2 أحرف على الأقل').max(500),
});

export type ReviewReplyType = z.infer<typeof ReviewReplySchema>;

// ============= DRIVER VALIDATORS =============

export const DriverScheduleSchema = z.object({
  driverId: z.string().min(1, 'اختر المندوب'),
  dayOfWeek: z.enum(['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'صيغة الوقت غير صحيحة'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'صيغة الوقت غير صحيحة'),
}).refine(
  (data) => data.startTime < data.endTime,
  { message: 'وقت الانتهاء يجب أن يكون بعد وقت البدء', path: ['endTime'] }
);

export type DriverScheduleType = z.infer<typeof DriverScheduleSchema>;

// ============= FORM VALIDATORS =============

export const LoginSchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صحيح'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
});

export type LoginType = z.infer<typeof LoginSchema>;

// ============= ERROR HANDLER =============

/**
 * Convert Zod validation errors to user-friendly messages
 */
export const formatZodError = (error: z.ZodError): Record<string, string> => {
  const formatted: Record<string, string> = {};

  error.errors.forEach((err) => {
    const path = err.path.join('.');
    formatted[path] = err.message;
  });

  return formatted;
};

/**
 * Validate form data and return errors or data
 */
export const validateFormData = <T>(
  schema: z.ZodSchema,
  data: unknown
): { success: boolean; data?: T; errors?: Record<string, string> } => {
  const result = schema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      errors: formatZodError(result.error),
    };
  }

  return {
    success: true,
    data: result.data as T,
  };
};
