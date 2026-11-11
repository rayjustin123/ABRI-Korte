# Abri Korte website: working notes for Claude

This repo is RJ's website for Abri Korte, one covered pickleball and badminton court at 724 Upper Tugbongan, Consolacion, Cebu. It is open 24 hours, with quiet hours from 10 PM to 5 AM. `README.md` explains the pages and builds. This file holds what to know before changing anything: where things live, RJ's standing rules, the brand, and the routines that keep coming back.

## Where things live

- Live site: https://abrikorte.com. www.abrikorte.com and https://abri-korte.vercel.app both redirect to it (308, set in the Vercel project's Domains settings), so old links still work and Google only sees one address. Vercel deploys `main` on every push. Check a deploy with `curl -s https://api.github.com/repos/rayjustin123/ABRI-Korte/commits/<sha>/status` and wait for "success". Run that check in its own command, not in the same one as the commit.
- Booking page, the landing page at the site root: `index.html`, built by `src/build.py` from `src/template.html`, `src/rows.txt` (taken slots) and `src/tourney.json`. Tabs open with `#book`, `#tournament`, `#rates` and `#info`.
- Home page: `home/index.html` with `home/player.jpg` and `home/player-depth.png`, built by `src/home/build_home.py` from `src/home/`. Its registration deadline comes from `src/tourney.json`.
- Search: `src/seo.py` adds structured data to both pages (the court as a SportsActivityLocation, plus the tournament as a SportsEvent while it is still coming up) and rewrites `sitemap.xml` at the site root whenever either page is rebuilt. `robots.txt` points crawlers to the sitemap. The booking page title is set in `TITLE` in `src/build.py`.
- `tools/`: page tests, the point-cloud player, and the Reel and post renderers. See `tools/README.md`. Not part of the site. `.vercelignore` also keeps `src/`, `README.md` and `CLAUDE.md` off the live site.
- Outside the repo, in RJ's accounts (he signs in himself):
  - Bookings: the Google Sheet "ABRI KORTE Reservation Schedule", Reservations tab, bookings from row 7.
  - Tournament: the tournament app, a Claude artifact in RJ's account (built as the Abri Korte Pickleball Invitational app). Its database has `event` (doc `config`), `teams`, `draws`, `matches` and `scores`. It still holds the old Invitational setup (two days, Beginners and Novice, four categories); it has not been switched to the Friendly Rally yet.
  - Messenger (every Book button opens it with the booking typed in): m.me/61593743265058. Facebook: ABRIKorteCebu. Instagram: @abri.korte (the account with the posts, crossposted from the Facebook page; @abrikorte is a separate empty account, so don't link to it).
  - Domain: abrikorte.com, registered at Hostinger on November 3, 2026 for one year. Its DNS at Hostinger points to Vercel: an A record for `@` and a CNAME for `www`, with the values shown in the Vercel project's Domains settings.
  - Google Search Console: abrikorte.com is a Domain property in RJ's Google account, verified on November 5, 2026 by a `google-site-verification` TXT record on `@` at Hostinger (keep that record or verification is lost). `https://abrikorte.com/sitemap.xml` is submitted there, and indexing was requested for `/` and `/home/`. URL Inspection there shows whether a page is on Google.

## RJ's standing rules

- No em dashes in anything written: site copy, captions, posts, messages. `src/build.py` refuses a page that has one.
- No guest names or contact details on the site or in this repo. `src/rows.txt` holds date, start, end and status only.
- Tournament: only confirmed teams' names go public. Never contacts, playing history, notes or payment details.
- Keep the GCash number off public pages.
- Captions for the court come in English and Bisaya. No emojis in tournament captions.
- Commit as RJ Mendoza, push to `main`, then confirm the Vercel deploy before saying it is live.

## Brand

- Colors: logo blue `#028FD6`, band blue `#016FA8`, charcoal `#1B242D`, cream `#F5F0EA`, tournament gold `#F2B233`, clay red `#A8442F`. Dark mode: band `#08131D`, optic yellow `#DDEB3F`.
- Type: Poppins for headings, Barlow for body text, Barlow Condensed for small caps buttons. Poppins and Barlow have no peso sign, so ₱ comes from Noto Sans, loaded for that one character.
- Headings are lockups like the logo: a heavier word (Poppins 500) on top, then a light (300), widely spaced word fitted to the same width, a gold rule and a small spaced tag. `fitLockups()` in `src/home/app.js` does the fitting.
- Logo: an A-frame mark with a clay bar across its base, ABRI over KORTE, a gold rule, then PICKLEBALL · BADMINTON. RJ has the blue, night, transparent and black versions as files. `tools/social/assets/` has a cream logo and the A mark.
- "Abri" means shelter in French and open in Cebuano, so: a covered court that is open 24 hours.

## Routines

### Sync the booking page with the sheet

1. In the browser, signed in as RJ, open the sheet (Google Drive search for "Reservation Schedule" finds it; the Sheets home search does not). Read the Reservations tab as CSV by fetching `gviz/tq?tqx=out:csv&sheet=Reservations` on the same spreadsheet URL from inside the sheet page. In that CSV the sheet title is merged into the first header cell, so the columns are: 0 date (YYYY-MM-DD), 3 Start, 4 End, 6 Guest name, 19 Status. Pick out only date, start, end and status in the page's script, so names never leave the sheet.
2. Write `src/rows.txt`, one taken slot per line: `2026-10-31|7:00 PM|11:00 PM|Confirmed`, from the start of the current week onward. Never copy names. Confirmed, Pending, Completed, Unpaid and blank statuses block a slot; Cancelled and No-show don't. A slot that runs past midnight ends the next day.
3. `python3 src/build.py src/rows.txt --site . --url https://abrikorte.com/`, check the page, commit, push, confirm the deploy.

### Add bookings to the sheet

Only when RJ asks, with the details he gives. In Google Sheets through the browser: jump to the cell with the Name box, then for each cell press Return, type the value and press Return again, since typing only sticks in edit mode. Keep each batch of browser actions to 25 or fewer.

### Refresh the tournament data

**Do not run this until the tournament app is switched to the Friendly Rally.** The app still holds the old Invitational config, and `src/tourney.json` is now edited by hand for the rally (one day, Nov 21, one Beginners division `bd` of up to 16 teams, prizes [5000, 3000, 1000] cash + [5, 4, 3] court hours, plus the hand-added `blurb` and `solo` fields that the app does not have). Running `make_tourney.py` now would put the Invitational back on the site. Until then, edit `src/tourney.json` directly (confirmed teams go in `teams` with `cat: "bd"`), then rebuild both pages as in step 3.

1. Export the tournament app's database (`event/config`, `teams`, `draws`, `matches`, `scores`) to a folder with the artifact data tool.
2. `python3 src/make_tourney.py <folder> src/tourney.json`
3. Rebuild both pages: `python3 tools/site/rebuild_booking.py --tourney` (keeps the schedule) and `python3 src/home/build_home.py --site-out home`.

### Change the home page

Edit `src/home/`, rebuild with `python3 src/home/build_home.py --site-out home`, and check it with `python3 tools/site/harness.py` on desktop and phone, light and dark. Both pages share one navigation: Home, Book, Tournament, Rates, Court Info. On phones it is a tab bar at the bottom.

### Change only the booking page template

`python3 tools/site/rebuild_booking.py` keeps the current schedule and its time stamp. Check with `tools/site/booking_flow.py` and `tools/site/booking_screens.py`.

## How the home page works

- One fixed WebGL canvas (three.js 0.149.0, Matter.js 0.19.0, GSAP 3.12.5 with ScrollTrigger, all from jsDelivr) paints each section's box with scissor viewports:
  - hero: pickleballs fall onto the ABRI KORTE letters. On phones the name spans the width, so balls that come to rest on it roll off and pile up above the tab bar.
  - court: the court surface settles, 4 posts go up on each side, then a gable roof comes down and two paddles rally. The near slope of the roof is see-through (0.22 light, 0.26 dark).
  - rentals: a paddle balancing a ball. Rates: a ball with a particle ring. Events: a turning paddle.
  - how booking works: a player rebuilt from points, from `player.jpg` and `player-depth.png` (red is depth, green is the outline). A new photo goes through `tools/point-cloud/`.
- Light by default, dark through the toggle, saved in localStorage `abri-theme` and shared with the booking page.
- Test hooks: `window.__abriDt`, `window.__abriHero.ff(seconds)`, `window.__abriCourt`, `window.__abriCloud`.

## Recent history (October and November 2026)

- Home page redesigned in three rounds: logo-style headings, one shared navigation, the covered court with posts and a roof, both meanings of Abri, food and drinks at the court, and a ready-stance player in the point cloud.
- Booking page: past hours hidden, a Today chip, and weekly regulars through December 2026 (Wednesday 6 to 10 PM, Thursday 7 to 11 PM, Friday 8 PM to 12 AM, Saturday and Sunday 7 to 11 PM).
- November 10: the booking schedule became tappable hours, because the old merged blocks ("6:00 AM, 11 hrs") confused people. The heading reads "Book the court" with a 1-2-3 line (pick a day, tap a start time, send it on Messenger). Each day is a grid of hour buttons in Day and Night rate bands, late night (12 to 6 AM) folded into one row, taken hours greyed, and the tournament's closed hours as one banner. Tapping an hour opens the booking at that time; How long is a set of buttons with end times, and the 4 and 8 hour buttons show the 3+1 free hours. The schedule was synced from the sheet the same day.
- Tournament: the Invitational (Nov 21 and 22, Beginners and Novice) was replaced on November 5 by the first Abri Korte Friendly Rally: Saturday, November 21, 2026 only, 7 AM first serve, beginners only, one division of up to 16 teams, solo or pair sign-ups, ₱400 per player. Prizes since November 11: 1st ₱5,000 + 5 court hours, 2nd ₱3,000 + 4 court hours, 3rd ₱1,000 + 3 court hours (first announced as ₱2,000 + 5, ₱1,000 + 4 and 3 hours). Prize hours never expire and can be sold to regulars with our help. Every player gets snacks and water. The free 1-hour court voucher for every team was dropped on November 11. Registration closes November 18 through https://abrikorte.com/#tournament (Register on Messenger). Sunday Nov 22 is open for bookings again. At ₱400 per player with ₱2,000 for the umpire, these prizes only break even with all 16 teams.
- Social, October 29: a 12.5 second Reel of the new regulation net, and a Team Abri Korte photo post thanking sponsors WEBIK and Seamaster Food Products Co.
- November 3: abrikorte.com connected. Share links and canonical addresses on both pages use it, and the Reel and post templates show it.
