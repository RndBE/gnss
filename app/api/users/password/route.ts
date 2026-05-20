import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const passwordSchema = z
  .object({
    email: z.string().trim().email(),
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .superRefine((data, context) => {
    if (data.newPassword !== data.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Konfirmasi password tidak sama.",
        path: ["confirmPassword"],
      });
    }

    if (data.currentPassword === data.newPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password baru harus berbeda dari password lama.",
        path: ["newPassword"],
      });
    }
  });

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = passwordSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      {
        error: "Data password tidak valid.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (!user) {
    return Response.json({ error: "Akun tidak ditemukan." }, { status: 404 });
  }

  const valid = await bcrypt.compare(
    parsed.data.currentPassword,
    user.passwordHash,
  );

  if (!valid) {
    return Response.json({ error: "Password lama salah." }, { status: 401 });
  }

  const passwordHash = bcrypt.hashSync(parsed.data.newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return Response.json({
    ok: true,
    message: "Password berhasil diperbarui.",
  });
}
