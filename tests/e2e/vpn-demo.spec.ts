import { expect, test } from '@playwright/test';

test('employee can submit the VPN demo ticket', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Email').fill('employee1@acme.test');
  await page.getByLabel('Password').fill('EmployeePass123!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: /operations dashboard/i })).toBeVisible();

  await page.getByRole('button', { name: /create ticket/i }).click();
  await page.getByLabel('Title').fill('I cannot connect to the company VPN after changing my password');
  await page
    .getByLabel('Description')
    .fill('The VPN fails after my password reset, but email still works. I need access to internal tools.');
  await page.getByRole('button', { name: /create and triage/i }).click();

  await expect(page.getByRole('heading', { name: /ticket detail/i })).toBeVisible();
  await expect(page.getByText(/AI assistant/i)).toBeVisible();
  await expect(page.getByText(/Network access|IT Support/i)).toBeVisible();
});
