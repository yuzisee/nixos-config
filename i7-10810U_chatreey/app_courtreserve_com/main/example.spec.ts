import { test, expect, errors } from '@playwright/test';

async function locator_visible(pw_locator: Locator, timeout_ms: number): Promise<boolean>
{
  if ((timeout_ms === undefined) || (timeout_ms == null)) {
    throw new Error('Please call locator_visible with timeout_ms set to some value');
  }

  try {
    await pw_locator.waitFor({state: 'visible', timeout: timeout_ms});
    return true;
  } catch (e) {
    if (e instanceof errors.TimeoutError) {
      return false;
    } else {
      throw e;
    }
  }
}

test('try booking pickleball', async ({ page }) => {
  var start_url = '';
  if(process.env.U) {
    if(process.env.P) {
      start_url = 'https://app.courtreserve.com/Online/MyProfile/MyClubs/13233';
    }
  }

  // await expect(start_url).notToBe('');
  if (start_url == '') {
    throw new Error('Please set U and P environment variables, so we have some kind of login credentials');
  }

  await page.goto(start_url);

  console.log('Hello hello hello');
  await page.locator('body').ariaSnapshot().then(function(val) { console.log(val); } );

  if (await page.getByRole('text').getByText('log in')) {
    let username_el: Locator = await page.getByRole('textbox').getByPlaceholder('Enter Your Email', {exact: true});
    if (locator_visible(username_el, 300)) {
      let passwd_el: Locator = await page.getByRole('textbox').getByPlaceholder('password');
      if (locator_visible(passwd_el, 300)) {
        console.log('Not logged in, need to login');
        await username_el.ariaSnapshot().then(function(val) { console.log(val); } );

        // Click the get started link.
        await username_el.fill(process.env.U);
        await passwd_el.fill(process.env.P);
	//  page.getByRole('link', { name: 'Get started' }).click();
      }
    }
  }


  // Expect a title "to contain" a substring.
  // await expect(page).toHaveTitle(/Playwright/);

  // Expects page to have a heading with the name of Installation.
  // await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
});

// Try:
//   U=user@name.com P=passwd npx playwright test
//   npx playwright test main/example.spec.ts
//   npx playwright test --headed
//   npx playwright test --ui
