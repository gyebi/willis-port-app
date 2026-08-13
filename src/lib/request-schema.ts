import { z } from "zod";

export const requestSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(2, "Customer name is required")
    .max(100, "Customer name is too long"),

  phone: z
    .string()
    .trim()
    .min(7, "Phone number is required")
    .max(20, "Phone number is too long"),

  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .optional()
    .or(z.literal("")),

  requestSource: z.enum([
    "WHATSAPP",
    "EMAIL",
    "PHONE",
    "WALK_IN",
    "WEBSITE",
  ]),

  shippingMethod: z.enum(["AIR", "SEA"]),

  goodsCategory: z.enum(["NORMAL", "SPECIAL"]),

  weightKg: z
    .number()
    .nonnegative()
    .optional(),

  volumeCbm: z
    .number()
    .nonnegative()
    .optional(),

  goodsDescription: z
    .string()
    .trim()
    .min(2, "Goods description is required")
    .max(1000, "Goods description is too long"),
});

export type CustomerRequestInput = z.infer<typeof requestSchema>;