import { test, expect } from '@playwright/test';

test('full round-trip: mask PII then restore from LLM response', async ({ page }) => {
  // 1. Navigate to the home page
  await page.goto('/');

  // 2. Type into the input textarea
  const inputText =
    'Hallo Martin, kannst du mir bitte die Rechnung an martin@example.com schicken? Meine IBAN: DE89370400440532013000';

  const inputTextarea = page.getByTestId('input-textarea');
  await inputTextarea.fill(inputText);

  // 3. Trigger masking explicitly — the app no longer auto-masks on every
  //    keystroke (would be wasteful for typing). User clicks "Maskieren"
  //    (or hits ⌘↵), then the detection runs.
  await page.getByTestId('mask-button').click();

  // 4. Wait for masked output to appear with at least EMAIL_1 and IBAN_1
  const maskedOutput = page.getByTestId('masked-output');

  await expect(maskedOutput).toContainText('[EMAIL_1]', { timeout: 15_000 });
  await expect(maskedOutput).toContainText('[IBAN_1]', { timeout: 15_000 });

  // 4. Click the Copy button on the masked pane and verify "Copied!" feedback
  const copyMaskedBtn = page.getByTestId('copy-masked');
  await copyMaskedBtn.click();

  const copyFeedback = page.getByTestId('copy-feedback');
  await expect(copyFeedback).toBeVisible({ timeout: 3_000 });

  // 5. In the Restore pane textarea, paste a simulated LLM response
  const llmResponse =
    'Klar, ich schicke die Rechnung umgehend an [EMAIL_1] (Empfänger-IBAN: [IBAN_1])';

  const restoreTextarea = page.getByTestId('restore-textarea');
  await restoreTextarea.fill(llmResponse);

  // 6. Wait for the restored output area to contain the original values
  const restoredOutput = page.getByTestId('restored-output');

  await expect(restoredOutput).toContainText('martin@example.com', { timeout: 5_000 });
  await expect(restoredOutput).toContainText('DE89370400440532013000', { timeout: 5_000 });

  // 7. Assert diagnostics: restored >= 2 and unknown === 0
  const diagnostics = page.getByTestId('restore-diagnostics');
  await expect(diagnostics).toBeVisible();

  const restoredCount = page.getByTestId('restore-count-restored');
  const unknownCount = page.getByTestId('restore-count-unknown');

  // Restored should show at least 2 entities. Locale-agnostic check: just
  // assert the number is ≥ 2 (text format varies between "2 restauriert"
  // in DE and "2 restored" in EN).
  await expect(restoredCount).toContainText(/^[2-9]|\d{2,}/, { timeout: 5_000 });

  // Unknown should show 0 — same locale-agnostic check.
  await expect(unknownCount).toContainText(/^0\b/);
});
