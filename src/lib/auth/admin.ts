import { prisma } from '@/lib/db/prisma';

const DEFAULT_ADMIN_EMAILS = ['l.kraus@franco-consulting.com'];

export function getAdminEmails(): string[] {
  const fromEnv = process.env.ADMIN_EMAILS;
  if (!fromEnv) {
    return DEFAULT_ADMIN_EMAILS;
  }

  const emails = fromEnv
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return emails.length > 0 ? emails : DEFAULT_ADMIN_EMAILS;
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return getAdminEmails().includes(normalized);
}

export async function ensureUserRole(userId: string, email?: string | null): Promise<void> {
  if (!userId) return;

  if (email && isAdminEmail(email)) {
    await prisma.$executeRaw`
      UPDATE "User"
      SET role = 'admin'
      WHERE id = ${userId}
    `;
    return;
  }

  await prisma.$executeRaw`
    UPDATE "User"
    SET role = 'user'
    WHERE id = ${userId}
      AND role IS NULL
  `;
}

export async function backfillUserRoles(): Promise<void> {
  const adminEmails = getAdminEmails();
  const queries = [
    prisma.$executeRaw`
      UPDATE "User"
      SET role = 'user'
      WHERE role IS NULL
    `,
  ];

  for (const email of adminEmails) {
    queries.push(
      prisma.$executeRaw`
        UPDATE "User"
        SET role = 'admin'
        WHERE lower(email) = ${email.toLowerCase()}
      `
    );
  }

  await prisma.$transaction(queries);
}
