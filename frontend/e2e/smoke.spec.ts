import { expect, test } from '@playwright/test'

test.describe('AlterF1 smoke tests', () => {
  test('home highlights navigate to 1988 under 1991 rules with Prost P1', async ({ page }) => {
    await page.goto('/')

    await expect(
      page.getByRole('heading', { level: 1, name: /Same races\. Different rules\./ }),
    ).toBeVisible()

    const prost1988Link = page.getByRole('link', {
      name: '1988 under 1991 rules: Alain Prost instead of Ayrton Senna',
    })
    await expect(prost1988Link).toBeVisible()

    const highlightsRegion = page.getByRole('region', {
      name: 'Seasons where the champion changes',
    })
    const highlightCards = highlightsRegion.locator(':scope > ul > li')
    expect(await highlightCards.count()).toBeGreaterThanOrEqual(10)

    await prost1988Link.click()

    await expect(page).toHaveURL(/\/season\/1988\?system=1991$/)
    await expect(page.getByText('Champion changed', { exact: true })).toBeVisible()
    await expect(page.getByText(/Champion changes: Prost\b.*instead of Senna\b/)).toBeVisible()

    const firstRow = page
      .getByRole('list', { name: 'Driver standings' })
      .getByRole('listitem')
      .first()
    await expect(firstRow).toContainText('PRO')
  })

  test('year picker on home opens the chosen season', async ({ page }) => {
    await page.goto('/')

    const seasonSelect = page.getByRole('combobox', { name: 'Season' })
    await expect(seasonSelect).toBeEnabled()
    await seasonSelect.selectOption('2021')

    await expect(page).toHaveURL(/\/season\/2021$/)
    await expect(page.getByRole('heading', { level: 1, name: '2021 season' })).toBeVisible()
  })

  test('scenario panel removes Alain Prost and promotes Senna to P1', async ({ page }) => {
    await page.goto('/season/1988?system=1991')

    const firstRow = page
      .getByRole('list', { name: 'Driver standings' })
      .getByRole('listitem')
      .first()
    await expect(firstRow).toContainText('PRO')

    await page.getByRole('button', { name: 'Scenario' }).click()

    const dialog = page.getByRole('dialog', { name: 'Scenario' })
    await expect(dialog).toBeVisible()

    // The URL update runs in a transition, so the controlled checkbox settles a moment after the
    // click: click, then wait for the state (check() would fail on the transient unchecked state).
    const prostCheckbox = dialog.getByRole('checkbox', { name: 'Alain Prost' })
    await prostCheckbox.click()
    await expect(prostCheckbox).toBeChecked()
    await expect(page).toHaveURL(/[?&]exclude=alain-prost(?:&|$)/)

    await dialog.getByRole('button', { name: 'Close scenario panel' }).click()
    await expect(dialog).toBeHidden()

    await expect(firstRow).toContainText('SEN')
    await expect(firstRow).toContainText('Ayrton Senna')
  })

  test('compare and progression tabs render matrix, chart, and clinch sentence', async ({
    page,
  }) => {
    await page.goto('/season/1988?system=1991')

    const tabsNav = page.getByRole('navigation', { name: 'Season views' })
    await tabsNav.getByRole('link', { name: 'Compare' }).click()

    await expect(page).toHaveURL(/\/season\/1988\/compare\?system=1991$/)
    await expect(
      page.getByRole('table', { name: 'How each points system ranks the 1988 season' }),
    ).toBeVisible()

    await tabsNav.getByRole('link', { name: 'Progression' }).click()

    await expect(page).toHaveURL(/\/season\/1988\/progression\?system=1991$/)
    const progressionSection = page.getByRole('region', { name: 'Points progression chart' })
    await expect(
      progressionSection.getByText(/clinched it at round \d+|Decided at the final race/i),
    ).toBeVisible()
    await expect(progressionSection.locator('div[aria-hidden="true"] svg').first()).toBeVisible()
  })

  test('Turkish season page shows half-points note and switches to English', async ({ page }) => {
    await page.goto('/tr/season/1991?system=1991')

    await expect(page.getByRole('heading', { level: 1, name: '1991 sezonu' })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'tr')

    const notesButton = page.getByRole('button', { name: 'Bu puanlar hakkında' })
    await expect(notesButton).toBeVisible()
    await notesButton.click()
    await expect(notesButton).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByText(/yarım puan/i)).toBeVisible()

    await page.getByRole('link', { name: 'Show this page in English' }).click()

    await expect(page).toHaveURL(/\/season\/1991\?system=1991$/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('heading', { level: 1, name: '1991 season' })).toBeVisible()
  })

  test('about page lists all five systems and F1DB link', async ({ page }) => {
    await page.goto('/about')

    await expect(page.getByRole('heading', { level: 1, name: 'How AlterF1 works' })).toBeVisible()

    const systemsTable = page.getByRole('table')
    await expect(systemsTable.locator('tbody tr')).toHaveCount(5)
    for (const systemId of ['1950', '1961', '1991', '2003', '2010']) {
      await expect(
        systemsTable.getByRole('rowheader', { name: new RegExp(`^${systemId}`) }),
      ).toBeVisible()
    }

    const f1dbLink = page.getByRole('link', { name: 'F1DB on GitHub' })
    await expect(f1dbLink).toBeVisible()
    await expect(f1dbLink).toHaveAttribute('href', 'https://github.com/f1db/f1db')
  })
})
