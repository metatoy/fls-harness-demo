import { expect, test } from '@playwright/test'

test('a player can solve the puzzle and see their result', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Guess the word' })).toBeVisible()

  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Make a guess' }).click()

  await expect(page.getByRole('heading', { name: 'Solved in 4 guesses' })).toBeVisible()
  await expect(page.getByText('Win rate')).toBeVisible()
  await expect(page.getByLabel('your result grid')).toBeVisible()
})

test('a player can start over', async ({ page }) => {
  await page.goto('/')
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Make a guess' }).click()
  await page.getByRole('button', { name: 'Play again tomorrow' }).click()
  await expect(page.getByRole('heading', { name: 'Guess the word' })).toBeVisible()
})

test('every control is reachable by keyboard', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Make a guess' })).toBeFocused()
})
