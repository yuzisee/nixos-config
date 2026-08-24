import fs from 'fs';
import { test, expect, errors, type Page, type Locator } from '@playwright/test';

const LAUNCH_MODE: string = 'prod';
// const LAUNCH_MODE: string = 'dev';
const RISKY_BUT_FASTER: boolean = true;

// https://www.lifetimeactivities.com/sunnyvale/court-reservations-policies/
// "Verified Sunnyvale residents may reserve courts 8 days in advance. Unverified Residents and Non-Residents may reserve courts 7 days in advance"
const LOOK_N_DAYS_IN_FUTURE: number = 8;
// e.g. queue up on Sunday evening, to run Monday at noon, to try and book the *next* Tuesday slot 8 days after that

const EARLIEST_HOUR_TO_BOOK: number = 7; // for runtime efficiency, don't even parse times earlier than this
// [!TIP]
// If it can't grab any of the `FAVOURITE_TIMES_BEST_FIRST[overrideAmPm]` times, it will book the earliest timeslot starting from `EARLIEST_HOUR_TO_BOOK`
const FAVOURITE_TIMES_BEST_FIRST: Record<'AM' | 'PM', string[]> = {
  AM: ['9:30 AM'],
  PM: ['8:30 PM', '9:00 PM', '8:00 PM']
};
// [!NOTE]
// Only ONE of the FAVOURITE_TIMES_BEST_FIRST lists will be considered, based on the value of `preset_ampm` in https://github.com/yuzisee/nixos-config/blob/8b133175f158cecd1a55d5cc74fe878ffc7d45bd/.github/workflows/bookit.yml#L40-L49

// const HOME_URL: string = 'https://app.courtreserve.com/Online/Reservations/Bookings/13233?sId=16984';
const HOME_URL: string = 'https://app.courtreserve.com/Online/Portal/Index/13233';
// const HOME_URL: string = 'https://app.courtreserve.com/Online/MyProfile/MyClubs/13233';
const HOME_CLUB: string = 'Lifetime Activities: Sunnyvale';
const HOME_TIMEZONE: string = 'America/Los_Angeles';

// Playwright documentation complains that if you call `isVisible()` directly that the results will be flaky...
// So, we'll need this helper function to check if a certain element becomes visible after the page finishes loading (Playwright auto-wait)
async function locator_visible(pw_locator: Locator, timeout_ms: number): Promise<boolean> {
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

interface SerializedDate {
  local_isoString: string;
  local_generalString: string;
  local_hour: number;
  local_minute: number;
  local_second: number;
  local_valueOf: number; // if you need the milliseconds, or something like that
}
// By setting `timezoneId` and implementing a `localtime_datenow` helper function, we have an easy way to do math inside a specific time zone
// (The booking site shows times in the local time zone of the court you're trying to book, so try to match that here)
test.use({
  // https://playwright.dev/docs/emulation
  // https://playwright.dev/docs/api/class-testoptions#test-options-timezone-id
  timezoneId: HOME_TIMEZONE,
});
async function localtime_datenow(p: Page): Promise<SerializedDate> {
  const date_in_playwright: SerializedDate = await p.evaluate(
    function() {
      var localtime_date = new Date();

      var tzoffset = localtime_date.getTimezoneOffset(); // FYI: `getTimezoneOffset` is not the offset of the DATE value itself, but rather the offset of the browser AT THE TIME the date value was instantiated.
      var tzoffset_str = '';
      if (tzoffset == 0) {
        tzoffset_str = 'Z';
      } else {
        var tzoffset_hour = Math.floor(Math.abs(tzoffset) / 60.0);
        var tzoffset_minute = (Math.abs(tzoffset) % 60);
        // [!TIP]
        // When you get tzoffset 480 that's actually UTC-8:00 (it's the negative direction)
        var tzoffset_direction = ((tzoffset <= 0) ? '+' : '-');
        // ^^^ Technically London is "+00:00" according to https://en.wikipedia.org/wiki/ISO_8601#Time_offsets_from_UTC

        tzoffset_str = tzoffset_direction + tzoffset_hour.toString().padStart(2, '0') + ':' + tzoffset_minute.toString().padStart(2, '0');
      }


      var localtime_monthnum = (localtime_date.getMonth() + 1).toString().padStart(2, '0');
      var localtime_isodate = localtime_date.getFullYear() + '-' + localtime_monthnum + '-' + localtime_date.getDate().toString().padStart(2, '0');
      var localtime_isotime = localtime_date.getHours().toString().padStart(2, '0') + ':' +
                              localtime_date.getMinutes().toString().padStart(2, '0') + ':' +
                              localtime_date.getSeconds().toString().padStart(2, '0');

      var localdate_serialized = {
        local_valueOf: localtime_date.valueOf(),
        local_isoString: localtime_isodate + 'T' + localtime_isotime + tzoffset_str, // ugh, they give us toISOString() but that converts to UTC anyway?
        local_generalString: localtime_date.toString(),
        local_hour: localtime_date.getHours(),
        local_minute: localtime_date.getMinutes(),
        local_second: localtime_date.getSeconds(),
      };

      return localdate_serialized;
    }
  );

  return date_in_playwright;
}

// Return: `true` if we are close enough to noon that you should probably proceed, `false` if we did sleep some, but in order to be safe against daylight savings time changes we want you to sleep again
async function sleep_until_noon(p: Page): Promise<boolean> {
  const countdown: SerializedDate = await localtime_datenow(p);
  if ((countdown.local_hour > 12) || (countdown.local_hour < 10)) {
    // 10am or earlier?
    // 1pm or later?
    console.log('countdown.local_hour is ' + countdown.local_hour + ' so sleep one hour and check again.');
    await p.waitForTimeout(60 * 60 * 1000.0);

    return false;
  } else if (countdown.local_hour == 10) {
    console.log('countdown["local_hour"] is ' + countdown.local_hour + ', which is almost 11am so sleep ~30mins and check again.');
    await p.waitForTimeout(29 * 60 * 1000.0);

    return false;
  } else {
    // It's almost noon!
    // The day is not selectable until exactly noon, so we'll need to wait just a bit more...

    if (countdown.local_hour == 11) {
      if ((countdown.local_minute < 59) || (countdown.local_second < 53)) {

        const secondsUntilNoon: number =
//          (11 - countdown.local_hour) * 60 * 60 +
          (60 - countdown.local_minute - 1) * 60 +  // e.g. if it's 11:59:30, you want to wait 0 minutes and 30 seconds
          (60 - countdown.local_second);

	console.log('Almost at time, sleep the final ' + (secondsUntilNoon / 60.0) + ' minutes until just a few seconds before noon');
        await p.waitForTimeout((secondsUntilNoon - 4.0) * 1000.0); // wait until 4 seconds left...
      } else {
        // It's 11:59:53pm~noon, so just return true and get going! Don't sleep, it's time to act!
      }
    } else {
      // [INVARIANT] It's 12:xx PM
      if (countdown.local_minute < 30) {
        console.warn('Are you testing for debugging purposes? You just passed noon. Proceeding anyway...');
      } else {
        console.log('Starting now... ' + countdown.local_generalString + ' ▶ Continuously sleep 1 hour at a time until tomorrow!');
        await p.waitForTimeout(60 * 60 * 1000.0);
        return false;
      }
    }

    return true;
  }
}

// Goal: Keep refreshing the page until the target date is visible... and then select the target date.
// Return: `true` if the date is available, `false` if we needed to refresh the page
async function refresh_until_date_available(p: Page, _year_num: number, _month_zerobased: number, long_month: string, short_month: string, day_num: number): Promise<boolean> {
  const short_date: string = short_month + ' ' + day_num;

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

   // k-scheduler-toolbar
   await p.getByRole('application').getByRole('toolbar').getByRole('button', {name: 'Today', exact: true}).waitFor({state: 'visible'});

    // k-sm-date-format
    if (await p.getByRole('application').getByRole('toolbar').getByRole('button', {name: short_date, exact: false}).isVisible()) {
      // SUCCESS!
      return true;
    } else {
      // let visibleDate: string[] = await page.locator('span.k-icon.k-i-calendar ~ span').allInnerTexts();
      // console.log(JSON.stringify(visibleDate));

      await p.locator('span.k-icon.k-i-calendar').click();
      let calendar_el: Locator = p.locator('div[data-role=calendar]');
      await calendar_el.waitFor({state: 'visible'});

      // TODO(from joseph): This seems like it should work, but if you hit right on the boundary I think something quirky happens with the loading... so revisit if we need to be faster
      /*
      if (RISKY_BUT_FASTER) {
        let force_date_data : string = year_num + '/' + month_zerobased + '/' + day_num;
	let force_feed_commandeer : Locator = p.locator('td.k-calendar-td:not(.k-state-selected):not([aria-selected])').getByRole('link').first();
        // await force_feed_commandeer.waitFor({state: 'visible'});
        const force_feed_result : string = await force_feed_commandeer.evaluate(
          function (force_el, new_data_val) {
            force_el.dataset.value = new_data_val;
	    var commandeer_result = force_el.outerHTML;
	    force_el.click();
            return commandeer_result;
          }, force_date_data
        );
        console.log('Force feed ' + force_feed_result + ' at ' + (new Date().toISOString()) + ' UTC');
        // await force_feed_commandeer.click();
        return false;
      }
      */

      let day_chooser_el: Locator = calendar_el.locator('div.k-calendar-monthview');

      let correct_month_shown: Locator = calendar_el.getByRole('button', {name: long_month, exact: false});
      if (!(await correct_month_shown.isVisible())) {
        // [INVARIANT]: A different month is showing than the one we want. Try to switch using the switcher.

	let quickjump_day_el : Locator = day_chooser_el.getByRole('grid').locator('td.k-other-month[role=gridcell]').getByRole('link', {name: '' + day_num, exact: true});
	let quickjump_htmltitle : string = long_month + ' ' + day_num + ',';
	// e.g. 'Monday, February 2, 2026'
        if ((await quickjump_day_el.isVisible()) && ((await quickjump_day_el.getAttribute('title'))!.indexOf(quickjump_htmltitle) != -1)) {
          // Quickly jump to the day we want, otherwise it could slow us down an extra second or two!
          await quickjump_day_el.click();
          return true;
	} else {
	  if (RISKY_BUT_FASTER) {
            console.log("Couldn't find the k-other-month " + long_month + "'s " + day_num + ' yet either. Did you wake from sleep too early? Refresh now & try again → ' + (new Date().toISOString()) + ' UTC');
            // Don't bother clicking the month selector and the month and waiting for it to re-animate. That can burn 1.6s+ and we don't really gain anything.
            await p.reload();
            return false;
          }

          // Switch months the slow way, then...

          await calendar_el.locator('a[data-action=nav-up][role=button]').click(); // this can take ~300ms+ though
          let month_chooser_el: Locator = calendar_el.locator('div.k-calendar-yearview');
          await month_chooser_el.waitFor({state: 'visible'});
          let target_month_el: Locator = month_chooser_el.getByRole('grid').getByRole('link', {name: short_month});
          if (await target_month_el.isVisible()) {
            // Okay, it's there!
            await target_month_el.click(); // this can take +440ms though
          } else {
            console.log('Month ' + long_month + ' not yet selectable (did you wake from sleep too early?)... so refresh @ ' + (new Date().toISOString()) + ' UTC');
            await month_chooser_el.ariaSnapshot().then(function(val) { console.log(val); } );
            await p.reload();
            return false;
          }
	}

	// end if different month
      }

      // [INVARIANT]: OK good! We're should be on the correct month now.
      await expect(correct_month_shown).toBeVisible(); // this sometimes waits ~900ms (or maybe longer??)
      await expect(day_chooser_el).toBeVisible();

      let target_day_el: Locator = day_chooser_el.getByRole('grid').getByRole('link', {name: '' + day_num, exact: true});
      if (await target_day_el.isVisible()) {
        await target_day_el.click();
        return true;
      } else {
        console.log('Day ' + day_num + ' not yet selectable (did you wake from sleep too early?), refresh @ ' + (new Date().toISOString()) + ' UTC');
        await day_chooser_el.ariaSnapshot().then(function(val) { console.log(val); } );
        await p.reload();
        return false;
      }
    }
}

async function get_to_pickleball_reservations(p: Page): Promise<Locator> {

  // [!CAUTION]
  // Here id="respMenu" gives the desktop dropdown (which you can hover) above 992px
  //  and id="fn-nav-clone" gives the mobile dropdown (which you would toggle)
  let mobile_detect_el : Locator = p.locator('nav ul#respMenu a#menu-bar-container-web');
  if (await mobile_detect_el.isVisible()) {
    console.log('Traversing mmenu...');

    // ...but the desktop one is finnicky (it appears to use `ace-responsive-menu` which relies on Javascript's onMouseenter & onMouseleave rather than onHover), so let's rely on the mobile one for now
    await p.setViewportSize( { width: 800, height: 720 });
    // https://github.com/microsoft/playwright/blob/37d58bd440ea06966c98508714854563db46df0a/packages/playwright/src/index.ts#L146
    await mobile_detect_el.click();
    // await p.locator('body').ariaSnapshot().then(function(val) { console.log(val); } );
    let all_reservations_mobile_el: Locator = p.locator('div#mobile-menu-container').getByRole('listitem').getByRole('link', { name: 'Reservations'});

    // await mobile_main_menu_el.filter( {has: all_reservations_mobile_el} ).getByRole('link', { name: 'Open submenu' }).click();
    // https://playwright.dev/docs/other-locators#parent-element-locator
    await all_reservations_mobile_el.locator('xpath=..').getByRole('link', { name: 'Open submenu' }).click();

    // p.locator('div#mobile-menu-container ~ div').getByRole('listitem').getByText('Pickleball Reservations')
    return p.locator('div#mobile-menu-container ~ div').getByRole('listitem').getByRole('link', { name: 'Pickleball Reservations'});
  } else {
    let hover_el : Locator = p.locator('nav ul#respMenu a.parent-header-link').getByText('Reservations', { exact: true });
    console.log('Hovering ace-responsive-menu...');
    await hover_el.hover();
    await p.waitForTimeout(200);
    // ^^^ wait for Javascript animation
    //     * The default https://github.com/samsono/Ace-Responsive-Menu/blob/2b6f89aa60c13976ea3be8d87293936bc93af948/js/ace-responsive-menu.js#L15 uses 'fast'
    //     * According to https://api.jquery.com/slideUp/ the 'fast' keyword makes it 200ms

    let submenu_parent_loc : Locator = p.getByRole('navigation').getByRole('listitem')
    // await expect(hover_el).toBeVisible();
    // await p.locator('div#render-body-container').ariaSnapshot().then(function(val) { console.log(val); } );
    // await expect(pickleball_reservations_el1).toBeVisible();
    return submenu_parent_loc.getByRole('listitem').getByRole('link', { name: 'Pickleball Reservations'} );
  }
}

async function book_best_slot(p: Page, target_ampm: 'AM' | 'PM'): Promise<boolean> {

  let alreadybooked_els: Locator = p.getByRole('presentation').getByRole('button').getByText('None Available');
  let reservable_els: Locator = p.getByRole('application').getByRole('button').getByText('Reserve');
  await alreadybooked_els.or(reservable_els).first().waitFor({ state: 'visible' });
  console.log('READY: ' + (await alreadybooked_els.count()) + ' booked ↔ available ' + (await reservable_els.count()));

  var reserveTimesChronological: string[] = [];
  // for (let r_el: Locator of (await reservable_els.all())) {
  for (let r_el of (await reservable_els.all())) {
    let reserve_btn_el: Locator = r_el.locator('xpath=..');
    const data_time: string | null = await reserve_btn_el.getAttribute('data-time');
    const data_courttype: string | null = await reserve_btn_el.getAttribute('data-courttype');

    if (data_time === null) {
      throw new Error("The website has changed, or we lost our connection to the internet. Either way, the script as-is won't be able to book... sorry!");
    }

    // *********************
    // Choose specific times... e.g. the earliest timeslot available starting from 7pm or earlier
    // *********************
    if (data_time.indexOf(target_ampm) == -1) {
      console.log(data_time + ' NOT OUR TARGET: ' + data_courttype);
    } else {
      const reserve_btn_hour: number = Number(data_time.split(':')[0]);
      if ((reserve_btn_hour == 12) || (reserve_btn_hour < EARLIEST_HOUR_TO_BOOK)) {
        console.log(data_time + ' TOO EARLY: ' + data_courttype);
      } else {
        console.log(data_time + ' RESERVABLE: ' + data_courttype);
        reserveTimesChronological.push(data_time);
      }
    }
  }

  const reserveTimes: Array<string> = topPriorityFullHourReservable(reserveTimesChronological, FAVOURITE_TIMES_BEST_FIRST[target_ampm]);

  console.log('FULL HOUR BOOKABLE, best first = ' + JSON.stringify(reserveTimes));

  // let randomTimeForTest: string = reserveTimes[Math.floor(Math.random() * reserveTimes.length)];
  // await p.getByRole('application').getByRole('button', { name: ' at ' + randomTimeForTest }).getByText('Reserve').click();
  const abort_after_ms : number = 1999;
  while(reserveTimes.length > 0) {

    const earliestSatisfactoryTime: string = reserveTimes.shift()!; // assuming we parse the DOM in chronological order (and why wouldn't we?)

    let ready_to_book_el: Locator = p.getByRole('application').getByRole('button', { name: ' at ' + earliestSatisfactoryTime }).getByText('Reserve');
    try {
      await ready_to_book_el.click({timeout: abort_after_ms});
      // SUCCESS!
      return true;
    } catch (e) {
      if (e instanceof errors.TimeoutError) {
	console.log("Wasn't able to click " + earliestSatisfactoryTime + ' after ' + abort_after_ms + 'ms...');
      } else {
        throw e;
      }
    }

    // end while
  }

  // [INVARIANT] If you get here, nothing was bookable for a full hour

  await p.locator('body').ariaSnapshot().then(function(val) { console.log(val); } );
  throw new Error('Nothing bookable on the target date. We are too late. There is nothing we can do at this point, sorry!');
}

async function sleep_until_end_of_first_minute(p: Page, or_until_locator_gone : Locator | null) : Promise<number> {
  console.log('Hello there')
  const minute_checker: SerializedDate = await localtime_datenow(p);
  console.log('I am about to start sleep_until_end_of_first_minute ' + minute_checker.local_generalString)
  if (minute_checker.local_minute == 0) {
    console.log('→ Lottery minute NOW')
    if (minute_checker.local_second < 59) {
      console.log('→ Lottery second LIVE')
      let sleep_range_millis : number = 0.5 * (60 - minute_checker.local_second) * 1000;
      console.log('Sleep half the time between now and the end of the minute... starting from ' + minute_checker.local_generalString);
      await p.waitForTimeout(sleep_range_millis);
      return sleep_range_millis;
    }
    console.log('→ Lottery second passed?')
  }

  if (or_until_locator_gone === null) {
    console.log('[INVARIANT] If you get here, the lottery was still running at ' + minute_checker.local_generalString + ' even though 12:01pm has been reached...?');
    // const sleep_nominal_to_avoid_spam_millis : number = 200; // 0.2s
    // await p.waitForTimeout(sleep_nominal_to_avoid_spam_millis);
  } else {
    // TODO(from joseph): Once you've entered the lottery, could you right away refresh the page and try booking other timeslots?
    console.log('I guess just sleep until whatever Locator is no longer visible? ' + minute_checker.local_generalString);
    try {
      await or_until_locator_gone.waitFor({ state: 'hidden', timeout: 9_000, });
      console.log('Oh, something happened!!!');
    } catch (error) {
      if (error instanceof errors.TimeoutError) {
        return 9000;
      } else {
        throw error;
      }
    }
  }
  return 0;
}

/*
 <div class="modal-dialog modal-modal1" style="max-width: 576px;"><div class="modal-content" id="modal1-container">

<style>
    .mobile-html .modal-body .spinner-container.active {
        height: 120% !important;
    }

    .mobile-html .error-inner {
        padding-top: 50px;
    }
</style>
<div id="create-res-modal" style="">



<div class="modal-outer-container" id="main-reservation-container" data-testid="create-reservation">
    <div class="modal-outer-inner-container">
        <div class="container">
            <div class="modal-page-inner">
                <form action="https://reservations.courtreserve.com//Online/ReservationsApi/CreateReservation/13233?uiCulture=en-US" data-ajax="true" data-ajax-begin="disableButtonsByClass('btn-submit')" data-ajax-method="POST" data-ajax-success="reservationFunctionSuccess(data,this)" id="createReservation-Form" method="post" novalidate="novalidate" class="lottery-msg">*

	       .
	      .
	     .

<div class="w-100 active spinner-wrapper-full" style="position:absolute!important;top:0;border-radius:4px;height:100%;background:#fff;height:100%;">
            <div class="loader-wrapper">
                <div class="loader-icon mb-6"><i class="fa-light fa-bolt-lightning"></i></div>
                <div class="loader-title mb-2">Lottery in Progress</div>
                <div class="loader-description mb-6">Randomizing reservations...</div>
                <div class="progress-loader mb-4" data-progress="92">
                    <div class="progress-loader-bar" style="width: 92%;"></div>
                </div>

                <div class="loader-description-seconds mb-8">Less than 2 seconds remaining</div>

                <hr class="loader-description-divider mb-8">

                <div class="loader-description-request mb-6">
                   <div class="loader-description-request-wrapper">
                       <i class="fa-regular fa-circle-check" style="color:green"></i>
                       <span> Reservation request submitted.</span>
                   </div>
                </div>

                <span class="loader-description-window-wrapper">
                    <div class="loader-description-window">
                        <div class="loader-description-window-icon">
                            <i class="fa-regular fa-clock"></i>
                        </div>
                        <div class="loader-description-window-texts">
                            <b>Keep this window open</b>
                            <div>
                                Final results will be display here once the lottery is complete. Closing this window may prevent updates from appearing.
                            </div>
                        </div>
                    </div>
                </span>
            </div>
</div>
*/
async function wait_for_lottery(p: Page) : Promise<boolean> {
  var bLotteryDetected : boolean = false;
  while(true) {
    let lotteryEl1 : Locator = p.locator('form#createReservation-Form').getByText('Lottery in Progress');
    let lotteryCheck1 : boolean = await lotteryEl1.isVisible();
    if (lotteryCheck1) {
      console.log('Found "Lottery in Progress" message by Element ID');
      await sleep_until_end_of_first_minute(p, lotteryEl1);
    }
    let lotteryEl2 : Locator = p.locator('form.lottery-msg').getByText('Lottery in Progress');
    let lotteryCheck2 : boolean = await lotteryEl2.isVisible();
    if (lotteryCheck2) {
      console.log('Found "Lottery in Progress" message by HTML class');
      await sleep_until_end_of_first_minute(p, lotteryEl2);
    }

    /*
            <div class="loader-wrapper">
                <div class="loader-icon"><i class="fa-regular fa-face-smile"></i></div>
                <div class="loader-title">Hang Tight!</div>
                <div class="loader-description">We are finalizing your booking. This may take a few more seconds during peak times.</div>
                <div class="progress-loader" data-progress="98">
                    <div class="progress-loader-bar" style="width: 98%;"></div>
                </div>
            </div>
    */
    let lotteryCheck3 : boolean = await p.locator('form#createReservation-Form > .createReservation-Form-container').getByText('Hang Tight!').isVisible();
    if (lotteryCheck3) {
      console.log('Found "Hang Tight!" message; does that mean booking succeeded?');
      await sleep_until_end_of_first_minute(p, null);
    }

    if (lotteryCheck1 || lotteryCheck2 || lotteryCheck3) {
      bLotteryDetected = true;
      console.log('Lottery appears to be active...');
    } else {
      return bLotteryDetected
    }
  }

  // end wait_for_lottery
}

async function fill_out_form(p: Page) : Promise<boolean> {

  let booking_form_el: Locator = p.locator('form#createReservation-Form');
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
  // This works by accident thanks to JavaScript's type coercion ("0" == 0.0 is true)
  if ((await stupid_checkbox_el.evaluate(el => window.getComputedStyle(el, '::after').opacity)) as any == 0.0) {
    // Even useInnerText can't interpret opacity (which is what the page seems to use) because pseudo-elements are not part of the DOM tree
    await disclosure_agree_el.locator('xpath=..').click();
    await expect(async () => {
      const checkmarkOpacity: number = await stupid_checkbox_el.evaluate(el => parseFloat(window.getComputedStyle(el, '::after').opacity));
      expect(checkmarkOpacity).toBeGreaterThanOrEqual(1.0);
    }).toPass();

  } else {
    const actual_style: CSSStyleDeclaration = await stupid_checkbox_el.evaluate(el => getComputedStyle(el, '::after'));
    // const actual_style: CSSStyleProperties = await stupid_checkbox_el.evaluate(el => getComputedStyle(el, '::after'));
    const unexpected_checkmark: string = 'Really? It was already checked? ' + JSON.stringify(actual_style);
    throw new Error(unexpected_checkmark);
  }

  const totalDueAmount: string | null = await booking_form_el.locator('label.total-due-amount').textContent();

  if (LAUNCH_MODE == 'prod') {
    console.log(
     '↳ ' + totalDueAmount + ' READY TO BOOK ' + (new Date().toISOString()) + ' UTC'
    );

    await booking_form_el.getByRole('button', { name: 'Save' }).first().click();
// <div class="modal-header-container" data-testid="remove-or-withdraw-modal"><div class="modal-title"><span class="modal-title-span" data-testid="title">Book a reservation for 7/15/2026</span></div><div class="modal-title-buttons"><button type="reset" data-testid="close-btn-modal-header" class="btn btn-light " data-dismiss="modal">Close</button><button __playwright_target__="call@258" type="button" data-testid="save-btn" class="btn btn-primary btn-submit fn-btn-disabled d-inline-flex d-flex-inherit" onclick="" disabled="" oldtext="Save" style="padding: 0px; width: 100px; height: 41px; outline: rgb(0, 106, 177) solid 2px; background-color: rgba(111, 168, 220, 0.498);"><span style="opacity:0;width:0px;">-</span><span class="btn-active-spinner"></span></button></div></div>
// <div class="modal-title-buttons "><button type="reset" data-testid="Close" class="btn btn-light fn-reservation-create-close " data-dismiss="modal">Close</button><button data-testid="Save" type="button" class="btn btn-primary btn-submit fn-btn-disabled d-inline-flex d-flex-inherit" onclick="" disabled="" oldtext="Save" style="padding: 0px; width: 100px; height: 38px;"><span style="opacity:0;width:0px;">-</span><span class="btn-active-spinner"></span></button></div>
    console.log( await p.locator('div.modal-title-buttons').first().evaluate(el => el.innerHTML) );
    await p.locator('div.modal-title-buttons').first().ariaSnapshot().then(function(val) { console.log(val); } );
    console.log( ' ↕ ↕ ');
    console.log( ' ↕ ↕ ');
    await p.locator('div.modal-title-buttons').last().ariaSnapshot().then(function(val) { console.log(val); } );
    console.log( await p.locator('div.modal-title-buttons').last().evaluate(el => el.innerHTML) );

    let saveButtonSpinners : Locator = p.locator('div.modal-title-buttons button span.btn-active-spinner');
    if ((await saveButtonSpinners.count()) > 0) {
      // [!CAUTION]
      // Apparently, `.isVisible()` and toBeHidden() etc. all consider a spinner hidden if it's DOM height & width are 0px
      // Hopefully, `.count()` and `toHaveCount()` will behave better.
      try {
        // WAIT FOR THE button to submit...
        await expect(saveButtonSpinners).toHaveCount(0, {timeout: 20 * 1000});
      } catch (pw_error) {
        console.log('If you are in the lottery, there will still be a spinner FYI. No problem, we can wait for the lottery to finish.');
      }
    } else {
      console.log('No spinner appeared... Did we click the [Save] button? How long does it normally take for the spinner to appear?');
    }

    // IF the lottery is running, we need to keep the window open long enough to participate in it fully.
    if (await wait_for_lottery(p)) {
      console.log('Lottery done? It is now ' + (await localtime_datenow(p)).local_isoString);
    } else {
      console.log('No lottery needed?');
    }

    let confirmation_popup : Locator = p.getByRole('alert').getByText('Reservation Confirmed');
    /*
- generic [ref=e1]:
  - text:   
  - generic [ref=e5]:
    - text:        
    - generic [ref=e6]:
      - generic [ref=e8]:
        - link [ref=e9] [cursor=pointer]:
          - /url: /Online/Portal/Index/13233
          - img [ref=e12]
        - link [ref=e13] [cursor=pointer]:
          - /url: "#menu"
          - generic [ref=e14]: 
      - generic [ref=e16]:
        - listitem [ref=e17]:
          - link [ref=e18] [cursor=pointer]:
            - /url: "#"
            - text: Events, Camps, And Classes 
        - listitem [ref=e19]:
          - link [ref=e20] [cursor=pointer]:
            - /url: "#"
            - text: Reservations 
        - listitem [ref=e21]:
          - link [ref=e22] [cursor=pointer]:
            - /url: "#"
            - text: Nana Xu 
          - text:     
        - listitem [ref=e23]:
          - link [ref=e24] [cursor=pointer]:
            - /url: "#menu"
    - application [ref=e35] [cursor=pointer]:
      - toolbar [ref=e36]:
        - generic [ref=e37]:
          - button [ref=e38]: Today
          - button [ref=e39]:
            - generic [ref=e40]: 
          - button [ref=e41]:
            - generic [ref=e42]: 
        - button [ref=e43]:
          - generic [ref=e44]: 
          - generic [ref=e45]: Thu, Aug 6
        - generic [ref=e47]: Pickleball Reservations
        - text: 
      - button [ref=e50]:
        - generic [ref=e51]: 
      - generic [ref=e53]: Pickleball
      - generic [ref=e54]: 8:00 AM 8:30 AM 9:00 AM 9:30 AM 10:00 AM 10:30 AM 11:00 AM 11:30 AM 12:00 PM 12:30 PM 1:00 PM 1:30 PM 2:00 PM 2:30 PM 3:00 PM 3:30 PM 4:00 PM 4:30 PM 5:00 PM 5:30 PM 6:00 PM 6:30 PM 7:00 PM 7:30 PM 8:00 PM 8:30 PM 9:00 PM 9:30 PM
      - generic [ref=e55]:
        - button [ref=e56]:
          - generic [ref=e59]: Reserve
        - button [ref=e60]:
          - generic [ref=e63]: Reserve
        - button [ref=e64]:
          - generic [ref=e67]: Reserve
        - button [ref=e68]:
          - generic [ref=e71]: Reserve
        - button [ref=e72]:
          - generic [ref=e75]: Reserve
        - button [ref=e76]:
          - generic [ref=e79]: None Available
        - button [ref=e80]:
          - generic [ref=e83]: Reserve
        - button [ref=e84]:
          - generic [ref=e87]: Reserve
        - button [ref=e88]:
          - generic [ref=e91]: Reserve
        - button [ref=e92]:
          - generic [ref=e95]: Reserve
        - button [ref=e96]:
          - generic [ref=e99]: Reserve
        - button [ref=e100]:
          - generic [ref=e103]: Reserve
        - button [ref=e104]:
          - generic [ref=e107]: Reserve
        - button [ref=e108]:
          - generic [ref=e111]: Reserve
        - button [ref=e112]:
          - generic [ref=e115]: Reserve
        - button [ref=e116]:
          - generic [ref=e119]: Reserve
        - button [ref=e120]:
          - generic [ref=e123]: Reserve
        - button [ref=e124]:
          - generic [ref=e127]: Reserve
        - button [ref=e128]:
          - generic [ref=e131]: Reserve
        - button [ref=e132]:
          - generic [ref=e135]: Reserve
        - button [ref=e136]:
          - generic [ref=e139]: Reserve
        - button [ref=e140]:
          - generic [ref=e143]: Reserve
        - button [ref=e144]:
          - generic [ref=e147]: Reserve
        - button [ref=e148]:
          - generic [ref=e151]: Reserve
        - button [ref=e152]:
          - generic [ref=e155]: Reserve
        - button [ref=e156]:
          - generic [ref=e159]: Reserve
        - button [ref=e160]:
          - generic [ref=e163]: Reserve
        - button [ref=e164]:
          - generic [ref=e167]: Reserve
  - text: 
  - paragraph [ref=e170]: © 2026 Powered by CourtReserve
  - text:     
  - dialog [ref=e172]:
    - generic [ref=e180]: You have been assigned to Pickleball G due to Pickleball H being no longer available.
    - text: "!"
    - button "OK" [active] [ref=e182] [cursor=pointer]
    */
    let weird_lottery_confirmation_message : Locator = p.getByRole('dialog').getByText('You have been assigned to Pickleball').and(
      p.getByRole('dialog').getByText('being no longer available')
    );

    // <div aria-labelledby="swal2-title" aria-describedby="swal2-html-container" class="swal2-popup swal2-modal swal2-icon-error swal2-show" tabindex="-1" role="dialog" aria-live="assertive" aria-modal="true" style="display: grid;"><button type="button" class="swal2-close" aria-label="Close this dialog" style="display: none;">×</button><ul class="swal2-progress-steps" style="display: none;"></ul><div class="swal2-icon swal2-error swal2-icon-show" style="display: flex;"><span class="swal2-x-mark">
    // <h2 class="swal2-title" id="swal2-title" style="display: block;">&#xFEFF;&#xFEFF;Reservation Notice</h2>
    // <div class="swal2-html-container" id="swal2-html-container" style="display: block;">Sorry, no available courts for the time requested.</div>
    let failure_popup : Locator = p.getByRole('dialog', { name: 'Reservation Notice', exact: false });

    // https://github.com/microsoft/playwright/blob/bfd1ec67a923589fd3b6ff30a6bcceba87ceaf96/packages/playwright/src/common/config.ts#L40
    await confirmation_popup.or(weird_lottery_confirmation_message).or(failure_popup).waitFor({state: 'visible', timeout: 30000});

    if (await failure_popup.isVisible()) {
      await failure_popup.getByRole('button', { name: 'OK' }).click();
      console.log('Sorry, no available courts for the time requested.');
      return false;
    } else if (await weird_lottery_confirmation_message.isVisible()) {
      console.log("I think that's it. Did the booking succeed?");
      return true;
    } else {
      await expect(confirmation_popup).toHaveText('Reservation Confirmed');
      console.log('SUCCESS at ' + (await localtime_datenow(p)).local_isoString);
      return true;
    }
  } else {
    console.log(
     '↳ ' + totalDueAmount + ' READY TO BOOK ' +
     (await booking_form_el.getByRole('button', { name: 'Save' }).first().ariaSnapshot())
    );

    await p.screenshot({ path: 'ready.png', fullPage: true });

    return true;
  }

// end fill_out_form
}

// "safe" version of .`valueOf` in the sense that we avoid daylight savings issues and/or midnight rollover issues.
async function n_days_in_future_valueOf_safe(p: Page) : Promise<number> {
  const local_scriptstart : SerializedDate = await localtime_datenow(p);
  const localnoon : string = local_scriptstart.local_isoString.split('T')[0] + 'T12:00:00Z'; // use "noon UTC" to avoid Daylight Savings problems when all we want to do is calculate a date (not a time)
  let n_days_from_script_launch : number = LOOK_N_DAYS_IN_FUTURE;
  if ((local_scriptstart.local_hour > 12) && (LAUNCH_MODE == 'prod')) {
    // I suppose you're queuing up the night before, in order to run with `--ui` or something
    n_days_from_script_launch = LOOK_N_DAYS_IN_FUTURE + 1;
  }
  return (new Date(localnoon)).valueOf() + n_days_from_script_launch * 24 * 60 * 60 * 1000;
}

function halfHourAfter(reserve_str: string): string {
  const [timestr, am_pm] = reserve_str.split(' ');
  const [hourstr, minstr] = timestr!.split(':');
  // const next_hourstr: string = (parseInt(hourstr) + 1).toString().padStart(2, '0');
  const next_hourstr: string = (parseInt(hourstr!) + 1).toString();
  // [!TIP]
  // As far as I can tell, the `data-testid="reserveBtn" data-time="..."` are not zero padded

  if ( minstr == '00') {
    return hourstr + ':30 ' + am_pm;
  } else {
    if ( hourstr == '11') {
      return '12:00 PM'; // 11:30 PM is excluded above already so must have been 11:30 AM, which has 12:00 PM next
    } else if (hourstr == '12') {
      return '1:00 ' + am_pm; // 12:30 AM has 1:00 AM next, and 12:30 PM has 1:00 PM next
    } else {
      return next_hourstr + ':00 ' + am_pm;
    }
  }
}

// There is a [Reserve] button for every half hour, but the point of this script is to try and get a full hour as early as we can.
// This helper function here will narrow down the options to only the [Reserve] buttons that still have a full hour available.
// The returned results will be chronological, EXCEPT you will have an extra copy of `favouriteTimes` at the very front, if any of them are also available for the full hour
function topPriorityFullHourReservable(halfHourTimes: Array<string>, favouriteTimes: string[]): Array<string> {
  var result: Array<string> = [];
  var reserveTimesLookup: Set<string> = new Set(halfHourTimes);
  for (let datatime_str of [...favouriteTimes, ...halfHourTimes]) {
    if (datatime_str != '11:30 PM') {
      // [!TIP]
      // `reserveTimesLookup.has(datatime_str)` should already be true, unless we're checking one of `favouriteTimes`
      if (reserveTimesLookup.has(datatime_str) && reserveTimesLookup.has(halfHourAfter(datatime_str))) {
        // Both `datatime_str` and `halfHourAfter` are bookable! That means...
	result.push(datatime_str);
	// ... `datatime_str` will let you book a full hour
      }
    }

    // end datatime_str
  }
  return result;
}

interface QuickMonth {
  long_month: string;
  short_month: string;
}

async function login_username_password(p: Page, u_str: string, p_str: string) : Promise<boolean> {
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
    (await locator_visible(p.getByText('log in to access your account'), 4000))
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
    let username_el: Locator = p.getByPlaceholder('Enter Your Email', {exact: true});
    if (await locator_visible(username_el, 300)) {
      let passwd_el: Locator = p.getByPlaceholder('password');
      if (await locator_visible(passwd_el, 300)) {
        console.log('Not logged in, need to login');

        await p.screenshot({ path: 'login-ready_' + u_str.substring(0, 1) + '.png', fullPage: true });
        await p.locator('body').ariaSnapshot().then(function(val) { console.log(val); } );

        // Click the get started link.
        await username_el.fill(u_str!);
        await passwd_el.fill(p_str!);

        console.log('Username and password IN');
	await p.getByRole('button', { name: 'Continue', exact: true }).click();
        console.log('Username and password SUBMITTED');
	await expect(p.getByTestId('warning-message-block')).not.toBeVisible();
        console.log('No warning, probably good?');
	await expect(p.getByText('The username or password is incorrect')).not.toBeVisible();
        console.log('Nobody is saying the username or password is wrong. So far so good.');

        return true;
      }
    }
  }
  return false;
}

async function login_but_also_report_waiver_expiry(p: Page, u_str: string, p_str: string, expected_destination_ok_locator: Locator, all_bookings_out : string[]) : Promise<boolean> {

  // If you're already logged out, it will take you to the login page.
  // If you're logged in, it will log you out (which takes you to the login page)
  await p.goto('https://app.courtreserve.com/Online/Account/LogOut/13233');

  await login_username_password(p, u_str, p_str);

  if (await locator_visible(expected_destination_ok_locator, 6000)) {
    console.log('Login OK? ' + u_str.substring(0, 1) + '…');
    return true;
  } else {

    let waiver_title : boolean = await p.getByText('REVIEW PARTICIPANT LIABILITY WAIVER').isVisible();
    let waiver_checkbox : boolean = await p.getByText('I have carefully read, fully understand, and accept all the provisions and terms as stated').isVisible();

    if (waiver_title || waiver_checkbox) {
    /*
- text: VIEW & REVIEW PARTICIPANT LIABILITY WAIVER AND HOLD HARMLESS AGREEMENT AND ASSUMPTION OF THE RISK
- list:
  - checkbox "I have carefully read, fully understand, and accept all the provisions and terms as stated."
  - text:  I have carefully read, fully understand, and accept all the provisions and terms as stated. CLICK TO SIGN
           */
            all_bookings_out.push('WAIVER HAS EXPIRED??');
/*
            let waiver_user_el_by_id : Locator = p.locator('input#SigningMemberFullName')
            let waiver_user_el_by_name : Locator =  p.locator('input[name=SigningMemberFullName]');
            if ((await waiver_user_el_by_id.count()) == 1) {
              all_bookings_out.push(await waiver_user_el_by_id.getAttribute('value'));
            }
            if ((await waiver_user_el_by_name.count()) == 1) {
              all_bookings_out.push(await waiver_user_el_by_name.getAttribute('value'));
            }
*/

      let waiver_needed: string[] = await p.locator('form#disclosures-form').allInnerTexts();
      // console.log(await p.content()); // innerHTML
      all_bookings_out.push(...waiver_needed);

/*
<div class="outer-container " id="membership-details-page">

<form action="/Online/Disclosures/Pending/13233" data-ajax="true" data-ajax-begin="disableButtonsByClass('submit-btn')" data-ajax-method="POST" data-ajax-success="successfullySignDisclosures(data,this)" id="disclosures-form" method="post" novalidate="novalidate">        <input id="SigningMemberFullName" name="SigningMemberFullName" type="hidden" value="Firstname Lastname">
        <div class="outer-inner-container">
            <div class="container">
                <div class="page-inner">
                            <div class="row membership-one-item">
                                <div class="modal-body fn-autoheight" id="disclosures-form-container">

<input data-val="true" data-val-number="The field OrganizationId must be a number." id="OrganizationId" name="OrganizationId" type="hidden" value="13233">
<input data-val="true" data-val-number="The field EventId must be a number." id="EventId" name="EventId" type="hidden" value="">
<input id="LogInMemberIsAllowedToSign" name="LogInMemberIsAllowedToSign" type="hidden" value="True">
<input data-val="true" data-val-number="The field ReservationId must be a number." id="ReservationId" name="ReservationId" type="hidden" value="">
<input id="ReturnUrl" name="ReturnUrl" type="hidden" value="/Online/Portal/Index/13233">
<input id="InitialScope" name="InitialScope" type="hidden" value="Login">


<div class="d-grid form-container membership-list-item">
    <div class="ef_post style2 mt30-smd mb-0 mt-0" style="padding: 10px;">
        <div class="details job-flex-inner d-flex" style="flex-direction: column; flex-wrap: wrap; justify-content: flex-end;">

            <span class="">
                <span style="padding-bottom:;display:">
<input id="Members_0__MemberFullName" name="Members[0].MemberFullName" type="hidden" value="Firstname Lastname"><input id="Members_0__IsAllowedToSign" name="Members[0].IsAllowedToSign" type="hidden" value="True"><input data-val="true" data-val-number="The field OrganizationMemberId must be a number." id="Members_0__OrganizationMemberId" name="Members[0].OrganizationMemberId" type="hidden" value="11227542">                        <div class="job_locate main-title-row" id="11227542_section">
                            <p class="m-auto bold">Firstname Lastname</p>
                        </div>
<input id="Members_0__Disclosures_0__Name" name="Members[0].Disclosures[0].Name" type="hidden" value="Participant Liability Waiver and Hold Harmless Agreement and Assumption of the Risk"><input id="Members_0__Disclosures_0__ContentType" name="Members[0].Disclosures[0].ContentType" type="hidden" value="TypedContent"><input id="Members_0__Disclosures_0__DisclosureText" name="Members[0].Disclosures[0].DisclosureText" type="hidden" value="&lt;p class=&quot;p1&quot; style=&quot;margin-bottom:0px;font-variant-numeric:normal;font-variant-east-asian:normal;font-variant-alternates:normal;font-kerning:auto;font-optical-sizing:auto;font-feature-settings:normal;font-variation-settings:normal;font-variant-position:normal;font-size:13px;line-height:normal;&quot;&gt;&amp;nbsp;&lt;/p&gt;&lt;p dir=&quot;ltr&quot; style=&quot;line-height:1.38;margin-top:12pt;margin-bottom:12pt;&quot; id=&quot;docs-internal-guid-e57ce6ea-7fff-2740-995c-1f957437e401&quot;&gt;&lt;span style=&quot;font-size:11pt;font-weight:700;font-variant:normal;vertical-align:baseline;white-space:pre-wrap;&quot;&gt;Please read this Waiver, Release, and Assumption of Risk carefully before signing.&lt;/span&gt;&lt;/p&gt;&lt;p dir=&quot;ltr&quot; style=&quot;line-height:1.38;margin-top:12pt;margin-bottom:12pt;&quot;&gt;&lt;span style=&quot;font-size:10pt;font-variant:normal;vertical-align:baseline;white-space:pre-wrap;&quot;&gt;I understand that participation in this activity is voluntary. By signing this waiver, I certify that I and/or my child (or minor in my care) am physically fit and able to participate.&lt;/span&gt;&lt;/p&gt;&lt;p dir=&quot;ltr&quot; style=&quot;line-height:1.38;margin-top:12pt;margin-bottom:12pt;&quot;&gt;&lt;span style=&quot;font-size:10pt;font-variant:normal;vertical-align:baseline;white-space:pre-wrap;&quot;&gt;On behalf of myself and/or as the parent or legal guardian of the minor participant, I agree to indemnify, defend, and hold harmless Lifetime Activities LLC and Lifetime Activities Sunnyvale LLC (collectively known as &amp;ldquo;Lifetime&amp;rdquo;) and the City of Sunnyvale, including their respective officers, employees, agents, and representatives, from and against any and all claims, demands, causes of action, damages, losses, liabilities, or expenses. I hereby waive, release, and discharge Lifetime and the City of Sunnyvale from any and all claims for injury, illness, disability, death, loss, or damage of any kind, whether known or unknown, that I or the minor may suffer arising out of or related in any way to participation in this class or activity, including claims arising from the negligence or carelessness of the released parties. I understand that participation involves inherent risks, including the risk of serious injury or death. Knowing these risks, I voluntarily assume full responsibility for any such risks on behalf of myself and/or the minor participant. This waiver and release shall be binding upon my/our heirs, executors, administrators, and assigns.&lt;/span&gt;&lt;/p&gt;&lt;p dir=&quot;ltr&quot; style=&quot;line-height:1.38;margin-top:12pt;margin-bottom:12pt;&quot;&gt;&lt;span style=&quot;font-size:10pt;font-variant:normal;vertical-align:baseline;white-space:pre-wrap;&quot;&gt;I acknowledge the contagious nature of COVID-19 and voluntarily assume the risk that I and/or my child(ren) may be exposed to or infected by COVID-19 while attending Lifetime programs or venues. I understand that such exposure may result in personal injury, illness, permanent disability, or death. I further understand that the risk of exposure may result from the actions, omissions, or negligence of myself and others, including Lifetime employees, volunteers, participants, and their families.&lt;/span&gt;&lt;/p&gt;&lt;p dir=&quot;ltr&quot; style=&quot;line-height:1.38;margin-top:12pt;margin-bottom:12pt;&quot;&gt;&lt;span style=&quot;font-size:10pt;font-variant:normal;vertical-align:baseline;white-space:pre-wrap;&quot;&gt;I grant Lifetime permission to photograph and/or record video of me and/or the registered minor participant and to use, reproduce, edit, publish, distribute, and display such images or recordings for lawful promotional purposes, including but not limited to newsletters, brochures, advertisements, websites, social media, press materials, and other print or digital communications.&lt;/span&gt;&lt;/p&gt;&lt;p dir=&quot;ltr&quot; style=&quot;line-height:1.38;margin-top:12pt;margin-bottom:12pt;&quot;&gt;&lt;span style=&quot;font-size:10pt;font-variant:normal;vertical-align:baseline;white-space:pre-wrap;&quot;&gt;I understand that no compensation will be provided for such use and that this authorization shall remain in effect indefinitely unless revoked by me in writing. I waive any right to inspect or approve the final materials in which my or the minor&amp;rsquo;s likeness appears.&lt;/span&gt;&lt;/p&gt;&lt;p dir=&quot;ltr&quot; style=&quot;line-height:1.38;margin-top:12pt;margin-bottom:12pt;&quot;&gt;&lt;span style=&quot;font-size:10pt;font-variant:normal;vertical-align:baseline;white-space:pre-wrap;&quot;&gt;I acknowledge that I have read this waiver and understand that important legal rights are being waived.&lt;/span&gt;&lt;/p&gt;&lt;p dir=&quot;ltr&quot; style=&quot;line-height:1.38;margin-top:0pt;margin-bottom:0pt;&quot;&gt;&lt;span style=&quot;font-size:10pt;font-variant:normal;vertical-align:baseline;white-space:pre-wrap;&quot;&gt;I further acknowledge that I have read and understand and will be subject to the &lt;/span&gt;&lt;a href=&quot;https://www.lifetimeactivities.com/policies-refunds/&quot; style=&quot;text-decoration:none;&quot;&gt;&lt;span style=&quot;font-size:10pt;font-variant:normal;text-decoration:underline;text-decoration-skip-ink:none;vertical-align:baseline;white-space:pre-wrap;&quot;&gt;registration, withdrawal and refund policies&lt;/span&gt;&lt;/a&gt;&lt;span style=&quot;font-size:10pt;font-variant:normal;vertical-align:baseline;white-space:pre-wrap;&quot;&gt; as stated on the Lifetime Activities website.&lt;/span&gt;&lt;/p&gt;&lt;p class=&quot;p1&quot; style=&quot;margin-bottom:0px;font-variant-numeric:normal;font-variant-east-asian:normal;font-variant-alternates:normal;font-kerning:auto;font-optical-sizing:auto;font-feature-settings:normal;font-variation-settings:normal;font-variant-position:normal;font-size:13px;line-height:normal;&quot;&gt;&amp;nbsp;&lt;/p&gt;"><input id="Members_0__Disclosures_0__FileGuid" name="Members[0].Disclosures[0].FileGuid" type="hidden" value=""><input id="Members_0__Disclosures_0__FileName" name="Members[0].Disclosures[0].FileName" type="hidden" value=""><input id="Members_0__Disclosures_0__RuleInstructions" name="Members[0].Disclosures[0].RuleInstructions" type="hidden" value=""><input data-val="true" data-val-number="The field Id must be a number." id="Members_0__Disclosures_0__Id" name="Members[0].Disclosures[0].Id" type="hidden" value="42136"><input id="Members_0__Disclosures_0__ReadAgreementMessage" name="Members[0].Disclosures[0].ReadAgreementMessage" type="hidden" value="I have carefully read, fully understand, and accept all the provisions and terms as stated."><input data-val="true" data-val-number="The field RequiredEventId must be a number." id="Members_0__Disclosures_0__RequiredEventId" name="Members[0].Disclosures[0].RequiredEventId" type="hidden" value=""><input class="signed-data-url" id="signature_data_url_00" name="Members[0].Disclosures[0].SignatureDataUrl" type="hidden" value="">                            <span class="fn-autoheight">

<script src="https://raw.githubusercontent.com/davidjbradshaw/iframe-resizer/master/js/iframeResizer.min.js"></script>

<input type="hidden" name="Org_CurrentDateTime" id="Org_CurrentDateTime" value="8/24/2026 2:03 AM">

<div class="disclosure-membership-container signature-not-valid-container pointer" id="signature_00_container">
        <!--<p style="font-size: 1.4rem;">-->
        <!--<span style="font-size: 1rem;" class="color-org">
            <img src="/Content/images/icons/signature_24.png" style="height: 22px; vertical-align: sub; "/>
        </span>
        Participant Liability Waiver and Hold Harmless Agreement and Assumption of the Risk
        </p>-->
        <a data-zindex="1000000" onclick="displayDisclosureDetails(42136, $(this))" class="a-modal btn btn-secondary btn-medium auto-height btn-details-page">
            <span class="d-flex">
                <img src="/Content/images/icons/signature_white_32.png" style="height: 22px; max-width: 40px; margin: auto;">
                <span class="white-space">
                    &nbsp; VIEW &amp; REVIEW PARTICIPANT LIABILITY WAIVER AND HOLD HARMLESS AGREEMENT AND ASSUMPTION OF THE RISK
                </span>
            </span>
        </a>


    <ul>



                <div style="position: relative" class="mt10 rowCheckbox">
<input data-role="checkbox" id="Members_0__Disclosures_0__AcceptAgreement" name="Members[0].Disclosures[0].AcceptAgreement" type="checkbox" value="true" class="k-checkbox k-checkbox-md k-rounded-md"><span class="check-box-helper "></span><label for="Members_0__Disclosures_0__AcceptAgreement" class="k-checkbox-label">I have carefully read, fully understand, and accept all the provisions and terms as stated.</label><input name="Members[0].Disclosures[0].AcceptAgreement" type="hidden" value="false"><script>
	kendo.syncReady(function(){jQuery("#Members_0__Disclosures_0__AcceptAgreement").kendoCheckBox({"label":"I have carefully read, fully understand, and accept all the provisions and terms as stated."});});
</script>                </div>
            <div>
                <div class="click-to-signup-container" data-zindex="1000000" id="click-to-signup-container_00" onclick="openSignatureModal('00', '42136', $(this))">
                    <span>CLICK TO SIGN</span>
                </div>
                <div class="hide signature-canvas-container" id="signature-canvas_00_container">
                    <div class="preview-signature-container" data-zindex="1000000" onclick="openSignatureModal('00', '42136', $(this))">
                        <img id="imported_signup_00_image">
                    </div>

                    <div id="signature_00_stamp" class="signature-stamp-container">
                        <div>
                            <label for="Disclosures_00_SignedOn">Date Signed</label>

                            <div class="d-block signature-stamp-time text-muted">

                            </div>
                        </div>

                        <div class="block sign-member-details hide">
                            <label>Signed By</label>
                            <div class="d-block text-muted sign-member-details-value">

                            </div>
                        </div>
                    </div>
                </div>
            </div>
    </ul>
</div>
                            </span>

                </span>
            </span>

            <div class="membership-list-item-button-container " style="padding-bottom: ; ">
                    <a onclick="saveSignedDisclosures()" class="btn btn-lg btn-block btn-org btn-submit btn-details-page" style="">
                            <span>SAVE SIGNATURE</span>

                    </a>
            </div>
        </div>
    </div>
</div>

*/
      return true;
    } else {

      await p.screenshot({ path: 'login-failed.png', fullPage: true });
      await p.locator('body').ariaSnapshot().then(function(val) { console.log(val); } );
      return false;
    }

  }

} // end login_but_also_report_waiver_expiry

// Overall strategy:
// ================
// PHASE 1: make sure you are logged in
// (Phase 2, optional) only if somehow we get redirected onto the wrong page, use the selector to click through to the correct one...
// Phase 3: Find the "Pickleball Reservations" link and click it.
// Phase 4: Sleep the thread (up to ~23hrs) until we get very very close to noon
// Phase 5: Quickly refresh the page until the date we want becomes visible, and then book!
test('try booking pickleball', async ({ page }) => {
  var start_url: string = '';
  var ready_u : string | undefined = undefined;
  var ready_p : string | null = null;
  if (LAUNCH_MODE == 'prod') {
    if(process.env['U']) {
      if(process.env['P']) {
        start_url = HOME_URL;
        ready_u = process.env['U']
        ready_p = process.env['P']
      }
    }
  } else {
    if(process.env['DEV_U']) {
      if(process.env['DEV_P']) {
        start_url = HOME_URL;
        ready_u = process.env['DEV_U']
        ready_p = process.env['DEV_P']
      }
    }
  }

  // await expect(start_url).notToBe('');
  if (start_url == '') {
    throw new Error('Please set U and P (or DEV_U and DEV_P) environment variables, so we have some kind of login credentials');
  }

  var overrideAmPm: 'AM' | 'PM';
  if(process.env['OVERRIDE_AMPM'] == 'AM' || process.env['OVERRIDE_AMPM'] == 'PM') {
    overrideAmPm = process.env['OVERRIDE_AMPM'];
  } else {
    throw new Error('If you are going to OVERRIDE_AMPM it has to be either "AM" or "PM", and not ' + JSON.stringify(process.env['OVERRIDE_AMPM']));
  }

  // Suppose we want to launch this around 11:57am, and will leave it running at least until 12:03pm to be safe...
  // test.setTimeout(6 * 60 * 1000);
  // Okay, now that we have the sleep, we can run this at like 9am so allow the test to run ~3hrs
  // test.setTimeout(3 * 60 * 60 * 1000);
  test.setTimeout(24 * 60 * 60 * 1000); // because `sleep_until_noon` could go all the way until the next day
  // The default timeout is only 30s
  // https://playwright.dev/docs/test-timeouts

  // TODO(from joseph): If we use more than just chromium in the future...
  // ```
  // if (browser.browserType().name() == "chromium") {
  // ```
    //await page.route('**/*.woff2', async function (r) {
    //  await r.fulfill( { status: 200, contentType: 'font/woff2', body: Buffer.from('') } );
    //});
    await (await page.context().newCDPSession(page)).send('Network.setBlockedURLs', { urls: ['*.woff2'] });
    // ^^^ We get too many
    //   "The resource https://app.courtreserve.com/Content/memberportal/lib/font-awesome/webfonts/fa-*.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally."
    // warnings in the console, so if it all works without these extra fonts (and it might even run faster), let's skip these downloads altogether.
  // }


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

  await login_username_password(page, ready_u!, ready_p!);

  console.log('Where are we going next?');
  await page.waitForURL(HOME_URL + '*');

  console.log('Ok, it seems we are logged in! ' + page.url());

  // ========
  // Phase 2: In case you end up at https://app.courtreserve.com/Online/MyProfile/MyClubs/13233 navigate to the `HOME_CLUB`'s page as quickly as possible
  // ========

  if (page.url().indexOf('Online/MyProfile/MyClubs') != -1) {
    // [INVARIANT] If you get here, we are on ...Online/MyProfile/MyClubs...
    //             ^^^ but that should be seemingly impossible because we haven't used that in HOME_URL for a long time. These days we will skip this block entirely
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

    await page.waitForURL('**/Online/Portal/Index**');
  }
  console.log("Alright, let's book a slot " + page.url());

  // ========
  // Phase 3: Find the "Pickleball Reservations" link and click it.
  // ========

  // await page.locator('body').ariaSnapshot().then(function(val) { console.log(val); } );
  if (page.url().indexOf('Online/Portal/Index') != -1) {
    if (await locator_visible(page.getByText('PROGRAM REGISTRATION'), 2000)) {
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

      let pickleball_reservations_el : Locator = await get_to_pickleball_reservations(page);

      await pickleball_reservations_el.hover();
      await pickleball_reservations_el.click();
    }
  }

  // TODO(from joseph): Is there a way to go straight to 'https://app.courtreserve.com/Online/Reservations/Bookings/13233?sId=16984' (it doesn't redirect properly if you aren't yet logged in...)
  // await page.locator('body').ariaSnapshot().then(function(val) { console.log(val); } );

  const N_DAYS_IN_FUTURE : Date = new Date(await n_days_in_future_valueOf_safe(page));
  const TARGET_MONTH: QuickMonth = {
    /*
    long_month: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][N_DAYS_IN_FUTURE.getMonth()],
    short_month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][N_DAYS_IN_FUTURE.getMonth()]
    */
    long_month: N_DAYS_IN_FUTURE.toLocaleString('en-US', { month: 'long' }),
    short_month: N_DAYS_IN_FUTURE.toLocaleString('en-US', { month: 'short' })
  };
  const TARGET_DAY: number = N_DAYS_IN_FUTURE.getDate(); // e.g. 28;

  // ========
  // Phase 4: Sleep the thread (up to ~23hrs) until we get very very close to noon
  // ========


  if (LAUNCH_MODE == 'prod') {
    // At 1024px width and smaller, the 'k-scheduler-toolbar' shows k-sm-date-format instead of k-lg-date-format
    // At 480px width and smaller, the table gets a little cumbersome to use
    await page.setViewportSize( { width: 616, height: 1700 });
    // Giving us 2400px of height makes it easier to see all the bookable slots at a glance

    while(true) {
      console.log('Wait until almost noon so we can grab ' + TARGET_MONTH.long_month + ' ' + TARGET_DAY + '… we are currently still ' + (await localtime_datenow(page)).local_isoString);
      if (await sleep_until_noon(page)) {
        break;
      }
    }
  } else {
    console.log('Debug mode: running at ' + (await localtime_datenow(page)).local_isoString);
    await page.setViewportSize( { width: 616, height: 720 });
  }

  console.log('WAKEUP: ' + (new Date().toISOString()) + ' UTC');

  // ========
  // Phase 5: Quickly refresh the page until the date we want becomes visible, and then book!
  // ========

  while(true) {
    console.log('BEGIN LONG WAIT');
    if (await refresh_until_date_available(page, N_DAYS_IN_FUTURE.getFullYear(), N_DAYS_IN_FUTURE.getMonth(), TARGET_MONTH.long_month, TARGET_MONTH.short_month, TARGET_DAY)) {
      break;
    }
  }

  console.log('MAIN LOOP');

  while(true) {
    console.log('DATE CORRECT: ' + (new Date().toISOString()) + ' UTC');

    // UJS XHR POST https://app.courtreserve.com/Online/Reservations/CreateReservation/13233?start=1/29/2026%209:00%20AM&end=1/29/2026%209:30%20AM&customSchedulerId=16984&courtTypeId=9&courtType=Pickleball
    await book_best_slot(page, overrideAmPm);

    if (await fill_out_form(page)) {

      if (process.env['GITHUB_ACTIONS'] == 'true') {
        await page.screenshot({ path: 'booked-' + LAUNCH_MODE + '.png', fullPage: true });
      } else {
        // Expect a title "to contain" a substring.
        await expect(page).toHaveTitle('Lifetime'); // "Pickleball Reservations | powered by CourtReserve"
      }
      return;
    }

    // [!TIP]
    // If you get here, we will have failed to book our slot (e.g. maybe all the slots became full right before we clicked Save)
    // In this case, the best thing we can do is loop again and try to book the next best available time.
    //
    // Every codepath of `fill_out_form` that returns `false` will also click the 'OK' button and drop you back to the main booking page.
    // We would rather not `reload` because we want to try again as fast as possible.

    let close_dialog_why_is_it_still_open : Locator = page.getByRole('dialog').getByRole('button', {name: "Close"}).first();

    if (await close_dialog_why_is_it_still_open.isVisible()) {
      console.log('Ahh we lost the lottery and now the dialog is still open! Close it please.');
      await close_dialog_why_is_it_still_open.click();
    }
    /*
- generic [active] [ref=e1]:
  - dialog [ref=e168]:
    - generic [ref=e175]:
      - generic [ref=e176]:
        - generic [ref=e177]: Book a reservation for 8/6/2026
        - generic [ref=e178]:
          - button "Close" [ref=e179] [cursor=pointer]
          - button "Save" [ref=e180] [cursor=pointer]
      - separator [ref=e181]
      - generic [ref=e182]:
        - generic [ref=e185]:
          - text: 
          - generic [ref=e187]:
            - generic [ref=e189]:
              - generic [ref=e190] [cursor=pointer]: Reservation Type *
              - listbox "Reservation Type *" [ref=e192] [cursor=pointer]:
                - option "Recreational Play - Pickleball" [selected] [ref=e193]:
                  - generic [ref=e194]: Recreational Play - Pickleball
                - button "select" [ref=e195]:
                  - generic [ref=e196]: 
                - text: 
            - generic [ref=e197]:
              - generic [ref=e198]:
                - generic [ref=e199] [cursor=pointer]: Start Time
                - generic [ref=e200]: 8:30 PM
              - generic [ref=e201]:
                - generic [ref=e202] [cursor=pointer]: Duration *
                - listbox "Duration *" [ref=e204] [cursor=pointer]:
                  - option "1 hour" [selected] [ref=e205]:
                    - generic [ref=e206]: 1 hour
                  - button "select" [ref=e207]:
                    - generic [ref=e208]: 
                  - text: 
              - generic [ref=e209]:
                - generic [ref=e210] [cursor=pointer]: End Time
                - textbox "End Time" [disabled] [ref=e211]: 9:30 PM
            - text:  
            - generic [ref=e213]:
              - generic [ref=e214] [cursor=pointer]: Player(s)
              - grid [ref=e219] [cursor=pointer]:
                - rowgroup [ref=e222]:
                  - row "# 1 Name ... Cost $13.00 Due $13.00" [ref=e223]:
                    - gridcell "# 1" [ref=e224]:
                      - generic [ref=e225]: "#"
                      - generic [ref=e226]: "1"
                    - gridcell "Name ..." [ref=e227]:
                      - generic [ref=e228]: Name
                      - generic [ref=e229]:
                        - generic [ref=e230]: ...
                        - text: 
                    - gridcell "Cost $13.00" [ref=e231]:
                      - generic [ref=e232]: Cost
                      - generic [ref=e234]: $13.00
                    - gridcell "Due $13.00" [ref=e235]:
                      - generic [ref=e236]: Due
                      - generic [ref=e237]: $13.00
                    - gridcell [ref=e238]
            - generic: 
            - generic: "*"
        - generic [ref=e240]:
          - generic [ref=e241] [cursor=pointer]: "Total Due:"
          - generic [ref=e242] [cursor=pointer]: $13.00
        - generic [ref=e243]:
          - generic [ref=e245]:
            - generic [ref=e246] [cursor=pointer]: Court Reservations
            - generic [ref=e247]:
              - text: Payment is due upon check-in (at the time of your reservation.) Payment is not required at the time of booking. However, if you opt to prepay for your court time, any court reservation refunds due to cancelations will be returned as an account credit ...
              - generic [ref=e248] [cursor=pointer]: View More
              - text: 
          - generic [ref=e252]:
            - checkbox "Check to agree to above disclosure" [checked]
            - generic [ref=e253] [cursor=pointer]: 
            - generic [ref=e254] [cursor=pointer]: Check to agree to above disclosure
      - separator [ref=e255]

    */
  }
});

test('read upcoming reservations', async ({ page }) => {
  const all_bookings : string[] = ['Upcoming reservations:'];

  // let login_ok_el: Locator = page.locator('h4').getByText('Hours of Availability');
  let login_ok_el: Locator = page.getByRole('heading', {name: 'Hours of Availability'});
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
...
- listitem:
  - link "Events, Camps, And Classes ":
    - /url: "#"
- listitem:
  - link "Reservations ":
    - /url: "#"
...
- listitem:
  - link:
    - /url: "#menu"
- listitem
- 'heading "Welcome to Lifetime Activities: Sunnyvale!" [level=1]'
- heading "Summer Classes & Camps Are in Full Swing—Sign Up for Tennis or Pickleball Today!" [level=4]
- link "BOOK A TENNIS COURT":
  - /url: https://app.courtreserve.com/Online/Reservations/Bookings/13233
- link "BOOK A PICKLEBALL COURT":
  - /url: https://app.courtreserve.com/Online/Reservations/Bookings/13233?sId=16984
- link "PROGRAM REGISTRATION":
  - /url: https://app.courtreserve.com/Online/Events/List/13233
- img "footer-logo.png"
- paragraph: (408) 735-7285
- paragraph: 755 S Mathilda Avenue
- paragraph: Sunnyvale, California, 94087
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

  if(process.env['WAIVERCHECK_USERNAMES']) {
    if(process.env['WAIVERCHECK_PASSWORDS']) {
      const u_w : string[] = process.env['WAIVERCHECK_USERNAMES'].split(',');
      const p_w : string[] = process.env['WAIVERCHECK_PASSWORDS'].split(',');

      expect(u_w.length, 'WAIVERCHECK_USERNAMES and WAIVERCHECK_PASSWORDS mismatch, so probably one of them has a comma `,` or else you did not set up the Github Actions correctly').toBe(p_w.length);

      for (let i = 0; i < Math.min(u_w.length, p_w.length); i++) {
        await login_but_also_report_waiver_expiry(page, u_w[i]!, p_w[i]!, login_ok_el, all_bookings);
      }
    }
  }

  if(process.env['READ_USERNAMES']) {
    if(process.env['READ_PASSWORDS']) {
      const u_array : string[] = process.env['READ_USERNAMES'].split(',');
      const p_array : string[] = process.env['READ_PASSWORDS'].split(',');

      expect(u_array.length, "READ_USERNAMES and READ_PASSWORDS don't match, so probably one of them has a comma ',' or else you didn't set up the Github Actions correctly").toBe(p_array.length);

      for (let i = 0; i < Math.min(u_array.length, p_array.length); i++) {
        // await page.goto('https://app.courtreserve.com/Online/Account/LogIn/13233');

        // await page.locator('body').ariaSnapshot().then(function(val) { console.log(val); } );

        let debug_login_result : boolean = !(await login_but_also_report_waiver_expiry(page, u_array[i]!, p_array[i]!, login_ok_el, all_bookings));
        if (debug_login_result) {
          console.log('Login FAILED?? … during `u_array/p_array[' + i + ']` but maybe we can just go directly to the target URL and it might work anyhow');
        }

        // "My Reservations"
        await page.goto('https://app.courtreserve.com/Online/Bookings/List/13233?type=1');
        /*
<div class="booking-list ant-flex css-sfktup ant-flex-align-stretch ant-flex-vertical" data-testid="booking-list-active" style="width: 100%; height: 100%; gap: 12px;">
  <div data-testid="booking-count" style="font-weight: 600; font-size: 24px; margin-bottom: 16px;">
    1 Booking Found
  </div>
  <div data-testid="booking-card-wrapper-58636963">
   <div class="booking-card-desktop booking-card-desktop-58636963" data-testid="booking-card" style="--border-color: #e1f2ae;">
    <div class="booking-card-desktop-content ant-flex css-sfktup ant-flex-align-stretch ant-flex-vertical" data-testid="booking-card-content" style="gap: 16px;">
     <div class="ant-flex css-sfktup ant-flex-align-center" data-testid="booking-card-header" style="gap: 16px;">
      <div class="booking-card-desktop-header ant-flex css-sfktup ant-flex-align-center" style="gap: 8px;">
*/
       // The `booking-card-desktop-header-indicator` is a circle icon, essentially.
/*
       <div class="booking-card-desktop-header-indicator-wrapper" data-testid="type-indicator-wrapper">
        <div class="booking-card-desktop-header-indicator" data-testid="type-indicator" style="background-color: rgb(225, 242, 174);"></div>
       </div>
       <h5 data-testid="type-name">Recreational Play - Pickleball</h5>
      </div>
      <div class="ant-flex css-sfktup ant-flex-align-center" data-testid="booking-card-badges" style="gap: 8px;"></div>
     </div>
     <div class="booking-card-desktop-content-list ant-flex css-sfktup ant-flex-align-stretch ant-flex-vertical" data-testid="content-list" style="gap: 8px;">
      <div class="ant-flex css-sfktup ant-flex-wrap-wrap ant-flex-align-baseline" data-testid="row-date-and-times" style="font-size: 16px; color: rgb(117, 116, 116); gap: 8px;">
       <i class="fa fa-light fa-calendar-clock"></i>
       <div class="row-text ant-flex css-sfktup">Mon, Aug 17th,  8:30 PM - 9:30 PM</div>
      </div>
      <div class="ant-flex css-sfktup ant-flex-wrap-wrap ant-flex-align-baseline" data-testid="row-members" style="font-size: 16px; color: rgb(117, 116, 116); gap: 8px;">
       <i class="fa fa-light fa-user-group"></i>
       <div class="row-text ant-flex css-sfktup">
        <div class="ant-flex css-sfktup ant-flex-wrap-wrap" data-testid="booking-tooltip">
         <div class="ant-flex css-sfktup ant-flex-wrap-wrap ant-flex-align-center" data-testid="booking-tooltip-group-0" style="margin-right: 4px;">
          <div class="ant-flex css-sfktup ant-flex-wrap-wrap ant-flex-align-center" data-testid="booking-tooltip-member-0-0" style="margin-right: 4px;">
           <div class="ant-flex css-sfktup" style="gap: 4px;">...<i class="fa-solid fa-circle-dollar" data-testid="booking-tooltip-unpaid-icon-0-0" aria-describedby="_r_2_" style="color: red; font-size: 20px; cursor: pointer; display: grid; place-items: center;"></i></div>
          </div>
         </div>
        </div>
       </div>
      </div>
      <div class="ant-flex css-sfktup ant-flex-wrap-wrap ant-flex-align-baseline" data-testid="row-courts" style="font-size: 16px; color: rgb(117, 116, 116); gap: 8px;">
       <i class="fa fa-light fa-table-cells-large"></i>
       <div class="row-text ant-flex css-sfktup">Pickleball</div>
      </div>
     </div>
*/
    // This is the end of `.booking-card-desktop-content` and the rest is the [Edit Reservation] button + [Pay] button
/*
    </div>
    <div class="booking-card-desktop-actions ant-flex css-sfktup ant-flex-align-stretch ant-flex-justify-center ant-flex-vertical" data-testid="booking-card-actions" style="gap: 16px;">
     <div><a href="/Online/MyProfile/Reservation/13233/58636963" data-testid="details-btn" class="ant-btn css-sfktup ant-btn-primary ant-btn-color-primary ant-btn-variant-solid ant-btn-background-ghost m-0 w-100" tabindex="0" aria-disabled="false"><span>Edit Reservation</span></a></div>
     <a href="/Online/MyBalance/PayMyBalance/13233?reservationId=58636963" data-testid="pay-btn" class="ant-btn css-sfktup ant-btn-primary ant-btn-color-primary ant-btn-variant-solid btn-primary m-0 w-100" tabindex="0" aria-disabled="false"><span>Pay</span></a>
    </div>
   </div>
  </div>
</div>
        */
        // <div class="ant-spin ant-spin-sm ant-spin-spinning css-sfktup" aria-live="polite" aria-busy="true"><span class="ant-spin-dot-holder"><span class="ant-spin-dot ant-spin-dot-spin"><i class="ant-spin-dot-item"></i><i class="ant-spin-dot-item"></i><i class="ant-spin-dot-item"></i><i class="ant-spin-dot-item"></i></span></span></div>
    let loadingSpinners : Locator = page.locator('div.ant-spin.ant-spin-spinning');
    if ((await loadingSpinners.count()) > 0) {
      // [!CAUTION]
      // Apparently, `.isVisible()` and toBeHidden() etc. all consider a spinner hidden if it's DOM height & width are 0px
      // Hopefully, `.count()` and `toHaveCount()` will behave better.
      try {
        // WAIT FOR THE spinner to finish...
        await expect(loadingSpinners).toHaveCount(0, {timeout: 20 * 1000});
      } catch (pw_error) {
        console.log('20s and it is still loading or we failed to detect what is happening');
      }
    } else {
      console.log('No spinner appeared... Did it load faster than normal or something?');
    }

        // await page.locator('body').ariaSnapshot().then(function(val) { console.log(val); } );

        let activeBookings_default: string[] = await page.locator('div.booking-card-desktop-content-list').allInnerTexts();
        // TODO(from joseph): If there's any funny business with how text is rendered, use `.allTextContents()` instead to grab the raw HTML text
        all_bookings.push(...activeBookings_default);
        all_bookings.push('───');

        if (debug_login_result) {
          console.log('So what is happening now?');
          await page.locator('body').ariaSnapshot().then(function(val) { console.log(val); } );
          await page.screenshot({ path: 'login-result_unknown.png', fullPage: true });
          if (activeBookings_default.length == 0) {
            console.log();
            throw new Error("Okay at this point we can't trust the result. Fail fast.");
          }
        }


      } // end for i

      const write_timestamp: SerializedDate = await localtime_datenow(page);
      all_bookings.push('This page was last refreshed on... ' + write_timestamp.local_isoString);

      console.log('FOUND: ' + all_bookings.join('\n'));

      fs.mkdirSync('upcoming_reservations', { recursive: true });
      fs.writeFileSync('upcoming_reservations/lifetime_activities.txt', all_bookings.join('\n'), 'utf8');
    } // end PASSWORDS
  } // end USERNAMES
});

test('logic self-test', async ({ }) => {
  const halfHourAfter_actual: string = halfHourAfter('8:30 PM');
  if (halfHourAfter_actual != '9:00 PM') {
    throw new Error('Wrong time increment → ' + halfHourAfter_actual);
  }

  const allAvailable_in: Array<string> = ['7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM'];
  const allAvailable_actual: Array<string> = topPriorityFullHourReservable(allAvailable_in, FAVOURITE_TIMES_BEST_FIRST['PM']);
  if (allAvailable_actual[0] != '8:30 PM') {
    throw new Error("Why didn't " + JSON.stringify(FAVOURITE_TIMES_BEST_FIRST['PM']) + ' take priority? Instead we got ' + JSON.stringify(allAvailable_actual));
  }

  console.log('All pass');
});

test('timecheck', async ({ page }) => {
  console.log('Would target ' + new Date(await n_days_in_future_valueOf_safe(page)).toString() + ' for LAUNCH_MODE=' + LAUNCH_MODE);
});


// Try:
//   DEV_U=user@name.com DEV_P=passwd OVERRIDE_AMPM=AM npx playwright test --ui
//   U=user@name.com P=passwd OVERRIDE_AMPM=PM npx playwright test main/example.spec.ts
//   npx playwright test --headed
