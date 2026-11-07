import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';

/**
 * Browser tests sign in with the testing login (NEXT_PUBLIC_AUTH_MODE=dev on the web, AUTH_MODE=dev
 * on the API): any email, no Google and no emailed code, so CI needs no Supabase project.
 */
export function testEmail(): string {
  return `e2e-${randomUUID().slice(0, 8)}@test.ohviana.dev`;
}

/** Fills the sign-in shown on /login and at checkout. */
export async function devSignIn(page: Page, email: string): Promise<void> {
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}
