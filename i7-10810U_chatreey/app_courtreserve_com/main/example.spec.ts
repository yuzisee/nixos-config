import { test, expect, errors } from '@playwright/test';

const LAUNCH_MODE = 'prod';

// https://www.lifetimeactivities.com/sunnyvale/court-reservations-policies/
// "Verified Sunnyvale residents may reserve courts 8 days in advance. Unverified Residents and Non-Residents may reserve courts 7 days in advance"
const LOOK_N_DAYS_IN_FUTURE: number = 8;
test.use({
  // https://playwright.dev/docs/emulation
  // https://playwright.dev/docs/api/class-testoptions#test-options-timezone-id
  timezoneId: 'America/Los_Angeles',
});
const DESIRED_AM_PM: string = 'PM';
const EARLIEST_HOUR_TO_BOOK: number = 7;

// const HOME_URL: string = 'https://app.courtreserve.com/Online/Reservations/Bookings/13233?sId=16984';
const HOME_URL: string = 'https://app.courtreserve.com/Online/Portal/Index/13233';
// const HOME_URL: string = 'https://app.courtreserve.com/Online/MyProfile/MyClubs/13233';
const HOME_CLUB: string = 'Lifetime Activities: Sunnyvale';

interface QuickMonth {
  long_month: string;
  short_month: string;
}

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

async function localtime_datenow(p: Page): Promise<Date> {
  let date_in_playwright: Date = await p.evaluate(
    function() {
      return new Date().toISOString();
    }
  );

  return new Date(date_in_playwright);
}

// Return: `true` if we are close enough to noon that you should probably proceed, `false` if we did sleep some, but in order to be safe against daylight savings time changes we want you to sleep again
async function sleep_until_noon(p: Page): Promise<boolean> {
  let countdown: Date = await localtime_datenow(p);
  if ((countdown.getHours() > 12) || (countdown.getHours() < 10)) {
    // 10am or earlier?
    // 1pm or later?
    console.log('countdown.getHours() is ' + countdown.getHours() + ' so sleep one hour and check again.');
    await p.waitForTimeout(60 * 60 * 1000.0);

    return false;
  } else if (countdown.getHours() == 10) {
    console.log('countdown.getHours() is ' + countdown.getHours() + ', which is almost 11am so sleep ~30mins and check again.');
    await p.waitForTimeout(29 * 60 * 1000.0);

    return false;
  } else {
    // It's almost noon!
    // The day is not selectable until exactly noon, so we'll need to wait just a bit more...

    if (countdown.getHours() == 11) {
      if ((countdown.getMinutes() < 59) || countdown.getSeconds() < 53) {

        let secondsUntilNoon: number =
//          (11 - countdown.getHours()) * 60 * 60 +
          (60 - countdown.getMinutes()) * 60 +
          (60 - countdown.getSeconds());

	console.log('Almost at time, sleep the final ' + (secondsUntilNoon / 60.0) + ' minutes until just a few seconds before noon');
        await p.waitForTimeout((secondsUntilNoon - 3.0) * 1000.0); // wait until 3 seconds left...
      }
    } else {
      console.warn('Are you testing for debugging purposes? You just passed noon. Proceeding anyway...');
    }

    return true;
  }
}

// Goal: Keep refreshing the page until the target date is visible... and then select the target date.
// Return: `true` if the date is available, `false` if we needed to refresh the page
async function refresh_until_date_available(p: Page, long_month: string, short_month: string, day_num: number): Promise<boolean> {
  let short_date: string = short_month + ' ' + day_num;

   console.log('SEARCHING FOR ' + short_date);

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
        - link:
          - /url: "#menu"
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
  - link "firstname lastname ":
    - /url: "#"
- listitem:
  - link:
    - /url: "#menu"
- listitem
- application:
  - toolbar:
    - button "Today"
    - button "Previous": 
    - button "Next": 
    - button " Mon, Jan 19"
    - text: Pickleball Reservations
  - text: Pickleball 8:00 AM 8:30 AM 9:00 AM 9:30 AM 10:00 AM 10:30 AM 11:00 AM 11:30 AM 12:00 PM 12:30 PM 1:00 PM 1:30 PM 2:00 PM 2:30 PM 3:00 PM 3:30 PM 4:00 PM 4:30 PM 5:00 PM 5:30 PM 6:00 PM 6:30 PM 7:00 PM 7:30 PM 8:00 PM 8:30 PM 9:00 PM 9:30 PM
  - alert: Loading...
- paragraph: © 2026 Powered by CourtReserve
- list

  */

   await p.getByRole('application').getByRole('toolbar').getByRole('button', {name: 'Today', exact: true}).waitFor({state: 'visible'});

    if (await p.getByRole('application').getByRole('toolbar').getByRole('button', {name: short_date, exact: false}).isVisible()) {
      return true;
    } else {
      // let visibleDate: Array<string> = await page.locator('span.k-icon.k-i-calendar ~ span').allInnerTexts();
      // console.log(JSON.stringify(visibleDate));

      await p.locator('span.k-icon.k-i-calendar').click();
      let calendar_el: Locator = p.locator('div[data-role=calendar]');
      await calendar_el.waitFor({state: 'visible'});

      let correct_month_shown: Locator = calendar_el.getByRole('button', {name: long_month, exact: false});
      if (!(await correct_month_shown.isVisible())) {
        // [INVARIANT]: A different month is showing than the one we want. Try to switch using the switcher.

        await calendar_el.locator('a[data-action=nav-up][role=button]').click();
	let month_chooser_el: Locator = calendar_el.locator('div.k-calendar-yearview');
	await month_chooser_el.waitFor({state: 'visible'});
	let target_month_el: Locator = month_chooser_el.getByRole('grid').getByRole('link', {name: short_month});
	if (await target_month_el.isVisible()) {
          // Okay, it's there!
	  target_month_el.click();
	} else {
	  console.log('Month ' + long_month + ' not yet selectable... so refresh!');
          await month_chooser_el.ariaSnapshot().then(function(val) { console.log(val); } );
          await p.reload();
          return false;
	}
      }

      // [INVARIANT]: OK good! We're should be on the correct month now.
      await expect(correct_month_shown).toBeVisible();
      let day_chooser_el: Locator = calendar_el.locator('div.k-calendar-monthview');
      await expect(day_chooser_el).toBeVisible();

      let target_day_el: Locator = day_chooser_el.getByRole('grid').getByRole('link', {name: '' + day_num});
      if (await target_day_el.isVisible()) {
        await target_day_el.click();
        return true;
      } else {
        console.log('Day ' + day_num + ' not yet selectable, refresh');
        await day_chooser_el.ariaSnapshot().then(function(val) { console.log(val); } );
        await p.reload();
        return false;
      }
    }
}

test('try booking pickleball', async ({ page }) => {
  var start_url: string = '';
  if(process.env.U) {
    if(process.env.P) {
      start_url = HOME_URL;
    }
  }

  // await expect(start_url).notToBe('');
  if (start_url == '') {
    throw new Error('Please set U and P environment variables, so we have some kind of login credentials');
  }

  // Suppose we want to launch this around 11:57am, and will leave it running at least until 12:03pm to be safe...
  // test.setTimeout(6 * 60 * 1000);
  // Okay, now that we have the sleep, we can run this at like 9am so allow the test to run ~3hrs
  // test.setTimeout(3 * 60 * 60 * 1000);
  test.setTimeout(24 * 60 * 60 * 1000); // because `sleep_until_noon` could go all the way until the next day
  // The default timeout is only 30s
  // https://playwright.dev/docs/test-timeouts

  //await page.route('**/*.woff2', async function (r) {
  //  await r.fulfill( { status: 200, contentType: 'font/woff2', body: Buffer.from('') } );
  //});
  await (await page.context().newCDPSession(page)).send('Network.setBlockedURLs', { urls: ['*.woff2'] });
  // ^^^ We get too many
  //   "The resource https://app.courtreserve.com/Content/memberportal/lib/font-awesome/webfonts/fa-*.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally."
  // warnings in the console, so if it all works without these extra fonts (and it might even run faster), let's skip these downloads altogether.


  await page.goto(start_url);

  // ====================================
  // PHASE 1: make sure you are logged in
  // ====================================

  let need_login_btn: Locator = page.locator('nav ul#respMenu').getByRole('listitem').getByRole('link', {name: 'LOG IN', exact: true});
  if (await locator_visible(need_login_btn, 2000)) {
    await need_login_btn.click();
    await page.waitForURL('**Account/LogIn**');
    // e.g. https://app.courtreserve.com/Online/Account/LogIn/13233
  }

  // console.log('Hello hello hello');
  // await page.locator('body').ariaSnapshot().then(function(val) { console.log(val); } );
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
  if (
    (await locator_visible(page.getByText('log in to access your account'), 4000))
  ) {
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

  await page.waitForURL(HOME_URL + '*');

  console.log('Ok, it seems we are logged in! ' + page.url());

  // ========
  // Phase 2: In case you end up at https://app.courtreserve.com/Online/MyProfile/MyClubs/13233 navigate to the `HOME_CLUB`'s page as quickly as possible
  // ========

  if (page.url().indexOf('Online/MyProfile/MyClubs') != -1) {
    let target_club: Locator = page.getByRole('heading', { name: HOME_CLUB });
    await expect(target_club).toBeVisible();

    await page.getByRole('region', { name: 'breadcrumb' }).ariaSnapshot().then(function(val) { console.log(val); } );
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
⋮
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
⋮
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
  await target_club.locator('~ div').getByRole('paragraph').getByRole('link', { name: 'VIEW' }).click();
 // TODO(from joseph): Should we just try to open 'https://app.courtreserve.com/Online/Portal/Index/13233' directly?

    await page.waitForURL('**/Online/Portal/Index**');
  }
  console.log("Alright, let's book a slot " + page.url());

  // ========
  // Phase 3: Find the "Pickleball Reservations" link and click it.
  // ========

  // await page.locator('body').ariaSnapshot().then(function(val) { console.log(val); } );
  if (page.url().indexOf('Online/Portal/Index') != -1) {
    if (await locator_visible(page.getByText('BOOK A COURT'), 2000)) {
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
⋮
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
⋮
- listitem:
  - link:
    - /url: "#menu"
- listitem
- img
- img "footer-logo.png"
⋮
- list:
  - listitem:
    - link "":
      - /url: https://www.lifetimeactivities.com
  - listitem:
    - link "":
      - /url: https://www.instagram.com/lifetime.activities?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==
- heading "Hours of Availability" [level=4]
- list:
  - listitem: Mon - Fri 8:00 AM - 10:00 PM
  - listitem: Saturday 8:00 AM - 10:00 PM
  - listitem: Sunday 8:00 AM - 8:00 PM
- heading "Links" [level=4]
- list:
  - listitem:
    - link "Looking for a different Lifetime Activities location? Click here!":
      - /url: https://www.lifetimeactivities.com/wp-content/uploads/Lifetime-Activities-on-CourtReserve-Home-Page-Links.pdf
- paragraph: © 2026 Powered by CourtReserve
- list
 */

  // [!CAUTION]
  // Here id="respMenu" gives the desktop dropdown (which you can hover)
  //  and id="fn-nav-clone" gives the mobile dropdown (which you would toggle)
  // but the desktop one is finnicky, so let's rely on the mobile one for now
  await page.setViewportSize( { width: 900, height: 720 });
  // https://github.com/microsoft/playwright/blob/37d58bd440ea06966c98508714854563db46df0a/packages/playwright/src/index.ts#L146
  await page.locator('nav ul#respMenu a#menu-bar-container-web').click();
  // await page.locator('body').ariaSnapshot().then(function(val) { console.log(val); } );
  let all_reservations_mobile_el: Locator = page.locator('div#mobile-menu-container').getByRole('listitem').getByRole('link', { name: 'Reservations'});
  // page.locator('div#mobile-menu-container ~ div').getByRole('listitem').getByText('Pickleball Reservations')
  let pickleball_reservations_mobile_el: Locator = page.locator('div#mobile-menu-container ~ div').getByRole('listitem').getByRole('link', { name: 'Pickleball Reservations'});
  // await mobile_main_menu_el.filter( {has: all_reservations_mobile_el} ).getByRole('link', { name: 'Open submenu' }).click();
  // https://playwright.dev/docs/other-locators#parent-element-locator
  await all_reservations_mobile_el.locator('xpath=..').getByRole('link', { name: 'Open submenu' }).click();

/*
  await all_reservations_desktop_el).getByText('Pickleball Reservations').click();
 // let all_reservations_desktop_el: Locator = page.getByRole('listitem').filter( {has: page.getByRole('link', { name: 'Reservations'}), visible: true });
  let all_reservations_desktop_el: Locator = page.locator('ul#respMenu');
  await all_reservations_desktop_el.hover()
  // await page.getByRole('listitem').getByRole('link', { name: 'Reservations'}).hover();
  // await page.getByText('BOOK A COURT').click(); // this defaults to Tennis courts...
  await all_reservations_desktop_el.ariaSnapshot().then(function(val) { console.log(val); } );
  // await all_reservations_desktop_el).getByText('Pickleball Reservations').click();
*/
  await pickleball_reservations_mobile_el.click();
}}

  // TODO(from joseph): Is there a way to go straight to 'https://app.courtreserve.com/Online/Reservations/Bookings/13233?sId=16984' (it doesn't redirect properly if you aren't yet logged in...)
  // await page.locator('body').ariaSnapshot().then(function(val) { console.log(val); } );

  // ========
  // Phase 4: Refresh the page until the date we want becomes visible, and then book!
  // ========

  if (LAUNCH_MODE == 'prod') {
    while(true) {
      console.log('Wait until almost noon... we are currently still ' + (await localtime_datenow(page)).toISOString());
      if (await sleep_until_noon(page)) {
        break;
      }
    }
  }

const N_DAYS_IN_FUTURE: Date = new Date((await localtime_datenow(page)).valueOf() + LOOK_N_DAYS_IN_FUTURE * 24 * 60 * 60 * 1000);
const TARGET_MONTH: QuickMonth = {
  long_month: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][N_DAYS_IN_FUTURE.getMonth()],
  short_month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][N_DAYS_IN_FUTURE.getMonth()]
};
const TARGET_DAY: number = N_DAYS_IN_FUTURE.getDate(); // e.g. 28;


  while(true) {
    console.log('MAIN LOOP');
    if (await refresh_until_date_available(page, TARGET_MONTH.long_month, TARGET_MONTH.short_month, TARGET_DAY)) {
      break;
    }
  }
  console.log('DATE CORRECT: ' + (new Date().toISOString()) + ' UTC');

  let alreadybooked_els: Locator = page.getByRole('presentation').getByRole('button').getByText('None Available');
  let reservable_els: Locator = page.getByRole('application').getByRole('button').getByText('Reserve');
  await alreadybooked_els.or(reservable_els).first().waitFor({ state: 'visible' });
  console.log('READY: ' + (await alreadybooked_els.count()) + ':' + (await reservable_els.count()));

  var reserveTimes: Array<string> = [];
  // for (let r_el: Locator of (await reservable_els.all())) {
  for (let r_el of (await reservable_els.all())) {
    let reserve_btn_el: Locator = r_el.locator('xpath=..');
    let data_time: string = await reserve_btn_el.getAttribute('data-time');
    let data_courttype: string = await reserve_btn_el.getAttribute('data-courttype');

    // *********************
    // Choose specific times... e.g. the earliest timeslot available starting from 7pm or earlier
    // *********************
    if (data_time.indexOf(DESIRED_AM_PM) == -1) {
      console.log(data_time + ' NOT OUR TARGET: ' + data_courttype);
    } else {
      let reserve_btn_hour: number = Number(data_time.split(':')[0]);
      if ((reserve_btn_hour == 12) || (reserve_btn_hour < EARLIEST_HOUR_TO_BOOK)) {
        console.log(data_time + ' TOO EARLY: ' + data_courttype);
      } else {
        console.log(data_time + ' RESERVABLE: ' + data_courttype);
        reserveTimes.push(data_time);
      }
    }
  }

  if (reserveTimes.length == 0) {
    await page.locator('body').ariaSnapshot().then(function(val) { console.log(val); } );
    throw new Error('Nothing bookable on the target date.');
  }

  let earliestSatisfactoryTime: string = reserveTimes[0]; // assuming we parse the DOM in chronological order (and why wouldn't we?)
  // let randomTimeForTest: string = reserveTimes[Math.floor(Math.random() * reserveTimes.length)];
  // await page.getByRole('application').getByRole('button', { name: ' at ' + randomTimeForTest }).getByText('Reserve').click();
  await page.getByRole('application').getByRole('button', { name: ' at ' + earliestSatisfactoryTime }).getByText('Reserve').click();

  let booking_form_el: Locator = page.locator('form#createReservation-Form');
  await booking_form_el.getByText('End Time').waitFor({state: 'visible'});
  // await booking_form_el.ariaSnapshot().then(function(val) { console.log(val); } );
  /*
- text: Book a reservation for 1/27/2026
- button "Close"
- button "Save"
- separator
- text: Reservation Type *
- listbox "Reservation Type *":
  - option "Recreational Play - Pickleball" [selected]
  - button "select": 
- text: Start Time 8:30 AM Duration *
- listbox "Duration *":
  - option "1 hour" [selected]
  - button "select": 
- text: End Time
- textbox "End Time" [disabled]: 9:30 AM
- text: Player(s)
- grid:
  - rowgroup:
    - row "# 1 Name firstname lastname Cost $7.00 Due $7.00":
      - gridcell "# 1"
      - gridcell "Name firstname lastname"
      - gridcell "Cost $7.00"
      - gridcell "Due $7.00"
      - gridcell
- text: "Total Due: $7.00 Court Reservations Payment is due upon check-in (at the time of your reservation.) Payment is not required at the time of booking. However, if you opt to prepay for your court time, any court reservation refunds due to cancelations will be returned as an account credit ... View More"
- checkbox "Check to agree to above disclosure"
- text:  Check to agree to above disclosure
- separator
- button "Close"
- button "Save"
   */
  await expect(booking_form_el.getByRole('textbox', { name: 'End Time' })).toBeDisabled();

  let disclosure_agree_el: Locator = booking_form_el.getByRole('checkbox', { name: 'Check to agree to above disclosure' });
  /*
  await disclosure_agree_el.waitFor( {state: 'visible'} );
  await expect(disclosure_agree_el).not.toBeChecked();
  await disclosure_agree_el.check();
  */
   // Ahhh... it's not a normal checkbox. It's a weird javascripty thing that renders '' (U+F0C4) Wingdings checkmark in a span
  let stupid_checkbox_el: Locator = disclosure_agree_el.locator('~ span.check-box-helper');
  if ((await stupid_checkbox_el.evaluate(el => window.getComputedStyle(el, '::after').opacity)) == 0.0) {
    // Even useInnerText can't interpret opacity (which is what the page seems to use) because pseudo-elements are not part of the DOM tree
    await disclosure_agree_el.locator('xpath=..').click();
    await expect(async () => {
      let checkmarkOpacity: number = await stupid_checkbox_el.evaluate(el => parseFloat(window.getComputedStyle(el, '::after').opacity));
      expect(checkmarkOpacity).toBeGreaterThanOrEqual(1.0);
    }).toPass();

  } else {
    let actual_style: CSSStyleProperties = await stupid_checkbox_el.evaluate(el => getComputedStyle(el, '::after'));
    let unexpected_checkmark: string = 'Really? It was already checked? ' + JSON.stringify(actual_style);
    throw new Error(unexpected_checkmark);
  }

  let totalDueAmount: string = await booking_form_el.locator('label.total-due-amount').textContent();
  console.log(
   totalDueAmount + ' READY TO BOOK ' +
   (await booking_form_el.getByRole('button', { name: 'Save' }).first().ariaSnapshot())
  );

  await booking_form_el.getByRole('button', { name: 'Save' }).first().click()
  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle('Lifetime');
});

// Try:
//   U=user@name.com P=passwd npx playwright test
//   npx playwright test main/example.spec.ts
//   npx playwright test --headed
//   npx playwright test --ui
