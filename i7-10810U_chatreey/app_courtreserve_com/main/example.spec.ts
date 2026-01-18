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
/*
- img
- text: Log In to Access Your Account Don't have an account? Create Account Email
- textbox "Enter Your Email"
- text: Password
- textbox "Enter Your Password"
- img "eye"
- checkbox "Remember Me"
- text: Remember Me Forgot Password?
- button "Continue"
- separator: or
- button "Request a Code"
- button "Continue with Google":
  - img
  - text: Continue with Google
...
 */
  if (await locator_visible(page.getByText('log in to access your account'), 2000)) {
/*
<div class="w-100 ant-flex css-2vbf92 ant-flex-align-stretch ant-flex-vertical" style="gap: 16px;">
 <div class="w-100 ant-flex css-2vbf92 ant-flex-align-stretch ant-flex-vertical" style="gap: 8px;">
   <label for="email" class="acss-yv1n5d">Email</label>
   <div class="ant-flex css-2vbf92 ant-flex-align-stretch ant-flex-vertical" style="gap: 4px;">
      <input autocomplete="off" name="email" autocapitalize="words" autocorrect="off" spellcheck="false" placeholder="Enter Your Email" type="text" class="ant-input css-2vbf92 ant-input-outlined acss-182ard6" value="">
   </div>
 </div>
 <div class="w-100 ant-flex css-2vbf92 ant-flex-align-stretch ant-flex-vertical" style="gap: 8px;">
   <div class="w-100 ant-flex css-2vbf92 ant-flex-align-stretch ant-flex-vertical" style="gap: 8px;">
      <label for="password" class="acss-yv1n5d">Password</label>
      <div class="ant-flex css-2vbf92 ant-flex-align-stretch ant-flex-vertical" style="gap: 4px;">
         <span class="ant-input-affix-wrapper css-2vbf92 ant-input-outlined ant-input-password acss-182ard6">
            <input autocomplete="off" type="password" name="password" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Enter Your Password" class="ant-input css-2vbf92">
            <span class="ant-input-suffix">
               <span role="img" aria-label="eye" tabindex="-1" class="anticon anticon-eye ant-input-password-icon" style="font-size: 16px;">
               <svg viewBox="64 64 896 896" focusable="false" data-icon="eye" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M942.2 486.2C847.4 286.5 704.1 186 512 186c-192.2 0-335.4 100.5-430.2 300.3a60.3 60.3 0 000 51.5C176.6 737.5 319.9 838 512 838c192.2 0 335.4-100.5 430.2-300.3 7.7-16.2 7.7-35 0-51.5zM512 766c-161.3 0-279.4-81.8-362.7-254C232.6 339.8 350.7 258 512 258c161.3 0 279.4 81.8 362.7 254C791.5 684.2 673.4 766 512 766zm-4-430c-97.2 0-176 78.8-176 176s78.8 176 176 176 176-78.8 176-176-78.8-176-176-176zm0 288c-61.9 0-112-50.1-112-112s50.1-112 112-112 112 50.1 112 112-50.1 112-112 112z"></path></svg>
               </span>
            </span>
         </span>
      </div>
   </div>
   <div class="w-100 ant-flex css-2vbf92 ant-flex-align-center ant-flex-justify-space-between">
      <label class="ant-checkbox-wrapper css-2vbf92" style="font-weight: 400;">
         <span class="ant-checkbox ant-wave-target css-2vbf92"><input class="ant-checkbox-input" type="checkbox" value="on">
            <span class="ant-checkbox-inner"></span>
         </span>
         <span class="ant-checkbox-label">Remember Me</span>
      </label>
      <a class="ant-typography css-2vbf92" style="padding: 5px 0px; font-size: 14px;">
         <b style="color: rgb(22, 119, 255); font-weight: 600;">Forgot Password?</b>
      </a>
   </div>
 </div>
</div>
 */
    let username_el: Locator = await page.getByPlaceholder('Enter Your Email', {exact: true});
    if (await locator_visible(username_el, 300)) {
      let passwd_el: Locator = await page.getByPlaceholder('password');
      if (await locator_visible(passwd_el, 300)) {
        console.log('Not logged in, need to login');

        // Click the get started link.
        await username_el.fill(process.env.U);
        await passwd_el.fill(process.env.P);
	await page.getByRole('button', { name: 'Continue', exact: true }).click();
	await expect(page.getByTestId('warning-message-block')).not.toBeVisible();
	await expect(page.getByText('The username or password is incorrect')).not.toBeVisible();
      }
    }
  }

  // Expect a title "to contain" a substring.
   //await expect(page).toHaveTitle('Lifetime');

  await expect(page.getByRole('heading', { name: 'Lifetime Activities: Sunnyvale' })).toBeVisible();
  await page.getByRole('region', { name: 'breadcrumb' }).ariaSnapshot().then(function(val) { console.log(val); } );
  console.log('Ok, it seems we are logged in!');
  await page.locator('body', { name: 'breadcrumb' }).ariaSnapshot().then(function(val) { console.log(val); } );
/*
- banner:
  - navigation:
    - 'link "Lifetime Activities: Sunnyvale"':
      - /url: /Online/Portal/Index/13233
      - 'img "Lifetime Activities: Sunnyvale"'
    - list:
      - listitem:
        - link "Events, Camps, And Classes ":
          - /url: "#"
      - listitem:
        - link "Reservations ":
          - /url: "#"
      - listitem:
        - link "Announcements":
          - /url: /Online/Announcement/Index/13233
      - listitem:
        - link "Yuzisee Playwright ":
          - /url: "#"
      - listitem
- listitem:
  - link "Events, Camps, And Classes ":
    - /url: "#"
- listitem:
  - link "Reservations ":
    - /url: "#"
- listitem:
  - link "Announcements":
    - /url: /Online/Announcement/Index/13233
- listitem:
  - link "Yuzisee Playwright ":
    - /url: "#"
- listitem:
  - link:
    - /url: "#menu"
- listitem
- region "breadcrumb":
  - heading "My Clubs" [level=4]
- link "Join Another Organization":
  - /url: /Online/MyProfile/JoinClub/13233
- 'img "Lifetime Activities: Sunnyvale"'
- 'heading "Lifetime Activities: Sunnyvale" [level=4]'
- text: Organization Hours of Operation
- grid:
  - rowgroup:
    - row "Day Open Time Close Time":
      - gridcell "Day"
      - gridcell "Open Time"
      - gridcell "Close Time"
  - rowgroup:
    - row "Monday 8:00 AM 10:00 PM":
      - gridcell "Monday"
      - gridcell "8:00 AM"
      - gridcell "10:00 PM"
    - row "Tuesday 8:00 AM 10:00 PM":
      - gridcell "Tuesday"
      - gridcell "8:00 AM"
      - gridcell "10:00 PM"
    - row "Wednesday 8:00 AM 10:00 PM":
      - gridcell "Wednesday"
      - gridcell "8:00 AM"
      - gridcell "10:00 PM"
    - row "Thursday 8:00 AM 10:00 PM":
      - gridcell "Thursday"
      - gridcell "8:00 AM"
      - gridcell "10:00 PM"
    - row "Friday 8:00 AM 10:00 PM":
      - gridcell "Friday"
      - gridcell "8:00 AM"
      - gridcell "10:00 PM"
    - row "Saturday 8:00 AM 10:00 PM":
      - gridcell "Saturday"
      - gridcell "8:00 AM"
      - gridcell "10:00 PM"
    - row "Sunday 8:00 AM 8:00 PM":
      - gridcell "Sunday"
      - gridcell "8:00 AM"
      - gridcell "8:00 PM"
- paragraph
- paragraph:
  - link "VIEW":
    - /url: /Online/Portal/Index/13233
- paragraph: © 2026 Powered by CourtReserve
- list

*/

});

// Try:
//   U=user@name.com P=passwd npx playwright test
//   npx playwright test main/example.spec.ts
//   npx playwright test --headed
//   npx playwright test --ui
