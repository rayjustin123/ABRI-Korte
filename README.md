# Abri Korte Booking

Phone-first booking page for Abri Korte, the covered pickleball and badminton court at 724 Upper Tugbongan, Consolacion, Cebu.

Players pick a day, see which hours are open or taken, get the price right away (day and night rates, weekday and weekend, the 3+1 promo, paddle and ball rentals), and tap **Book on Messenger**. That opens the Abri Korte Messenger chat with the booking details filled in. The booking is confirmed when the page replies.

## How it works

- One static page (`index.html`). No server, no database, no build step for hosting.
- Taken times come from `src/rows.txt`, exported from the ABRI KORTE Reservation Schedule sheet: date, start, end and status only. No guest names or contact details are ever in this repo.
- Rates, promo, rentals, drinks and house rules are set in `make_data()` in `src/build.py`.

## Update the schedule

1. Refresh `src/rows.txt` from the Reservations tab, one taken slot per line:

   ```
   2026-10-31|7:00 PM|11:00 PM|Confirmed
   ```

   Cancelled and No-show rows are ignored. A slot that ends after midnight (9:00 PM to 1:00 AM) runs into the next day.

2. Rebuild the page:

   ```
   python3 src/build.py src/rows.txt --site . --url https://rayjustin123.github.io/ABRI-Korte/
   ```

3. Commit and push. Vercel or GitHub Pages redeploys on its own.

## Deploy

- **Vercel:** New Project, import this repo, Framework Preset "Other", no build command, output directory left as the root.
- **GitHub Pages:** Settings, Pages, Deploy from a branch, `main`, `/ (root)`.
