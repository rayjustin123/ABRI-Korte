# Abri Korte website: working notes for Claude

This repo is RJ's website for Abri Korte, one covered pickleball and badminton court at 724 Upper Tugbongan, Consolacion, Cebu. It is open 24 hours, with quiet hours from 10 PM to 5 AM. `README.md` explains the pages and builds. This file holds what to know before changing anything: where things live, RJ's standing rules, the brand, and the routines that keep coming back.

## Where things live

- Live site: https://abri-korte.vercel.app. Vercel deploys `main` on every push. Check a deploy with `curl -s https://api.github.com/repos/rayjustin123/ABRI-Korte/commits/<sha>/status` and wait for "success".
- Booking page, the landing page at the site root: `index.html`, built by `src/build.py` from `src/template.html`, `src/rows.txt` (taken slots) and `src/tourney.json`. Tabs open with `#book`, `#tournament`, `#rates` and `#info`.
- Home page: `home/index.html` with `home/player.jpg` and `home/player-depth.png`, built by `src/home/build_home.py` from `src/home/`. Its registration deadline comes from `src/tourney.json`.
- `tools/`: page tests, the point-cloud player, and the Reel and post renderers. See `tools/README.md`. Not part of the site.
- Outside the repo, in RJ's accounts (he signs in himself):
  - Bookings: the Google Sheet "ABRI KORTE Reservation Schedule", Reservations tab, bookings from row 7.
  - Tournament: the Abri Korte Pickleball Invitational app, a Claude artifact in RJ's account. Its database has `event` (doc `config`), `teams`, `draws`, `matches` and `scores`.
  - Messenger (every Book button opens it with the booking typed in): m.me/61593743265058. Facebook: ABRIKorteCebu. Instagram: @abrikorte.

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

1. In the browser, signed in as RJ, open the sheet. Read the Reservations tab as CSV by fetching `gviz/tq?tqx=out:csv&sheet=Reservations` on the same spreadsheet URL from inside the sheet page.
2. Write `src/rows.txt`, one taken slot per line: `2026-10-31|7:00 PM|11:00 PM|Confirmed`. Never copy names. Confirmed, Pending, Completed, Unpaid and blank statuses block a slot; Cancelled and No-show don't. A slot that runs past midnight ends the next day.
3. `python3 src/build.py src/rows.txt --site . --url https://abri-korte.vercel.app/`, check the page, commit, push, confirm the deploy.

### Add bookings to the sheet

Only when RJ asks, with the details he gives. In Google Sheets through the browser: jump to the cell with the Name box, then for each cell press Return, type the value and press Return again, since typing only sticks in edit mode. Keep each batch of browser actions to 25 or fewer.

### Refresh the tournament data

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

## Recent history (October 2026)

- Home page redesigned in three rounds: logo-style headings, one shared navigation, the covered court with posts and a roof, both meanings of Abri, food and drinks at the court, and a ready-stance player in the point cloud.
- Booking page: past hours hidden, a Today chip, and weekly regulars through December 2026 (Wednesday 6 to 10 PM, Thursday 7 to 11 PM, Friday 8 PM to 12 AM, Saturday and Sunday 7 to 11 PM).
- Invitational: November 21 and 22, 2026. Registration closes November 18.
- Social, October 29: a 12.5 second Reel of the new regulation net, and a Team Abri Korte photo post thanking sponsors WEBIK and Seamaster Food Products Co.
