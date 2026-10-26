# Abri Korte Booking

Phone-first booking page for Abri Korte, the covered pickleball and badminton court at 724 Upper Tugbongan, Consolacion, Cebu.

Players pick a day, see which hours are open or taken, get the price right away (day and night rates, weekday and weekend, the 3+1 promo, paddle and ball rentals), and tap **Book on Messenger**. That opens the Abri Korte Messenger chat with the booking details filled in. The booking is confirmed when the page replies.

## How it works

- One static page (`index.html`). No server, no database, no build step for hosting.
- Taken times come from `src/rows.txt`, exported from the ABRI KORTE Reservation Schedule sheet: date, start, end and status only. No guest names or contact details are ever in this repo.
- Rates, promo, rentals, drinks and house rules are set in `make_data()` in `src/build.py`.

## Tournament

The **Tournament** tab shows the Abri Korte Pickleball Invitational: the run of show for each category, the roster, and results once games are scored. Its data comes from `src/tourney.json`, built from the tournament app with `src/make_tourney.py`. Only confirmed teams' names are published. No contacts, playing history, notes or payment details.

Link straight to it with `#tournament` at the end of the site address.

## Home page

The booking page stays the landing page at the site root. The home page lives at `/home/` (`home/index.html`): pickleballs falling onto the Abri Korte name, the covered court with two paddles rallying under the roof, rentals, rates and open hours, private group events, the Invitational, how booking works (the game night photo rebuilt from points of light) and how to find us. Light mode by default with a dark mode toggle. It loads three.js, Matter.js and GSAP from jsDelivr, and Poppins, Barlow and Cormorant Garamond from Google Fonts.

`src/home/group-depth.png` holds the depth (red channel) and the outline of the players (green channel) for the points in the booking section. It was made from `group.jpg` with a depth model, so if the photo changes, that file needs to be made again.

The logo on the booking page links to it, and every Book button on it links back to the booking page.

Sources are in `src/home/`. After changing them, rebuild:

```
python3 src/home/build_home.py --site-out home
```

## Update the schedule

1. Refresh `src/rows.txt` from the Reservations tab, one taken slot per line:

   ```
   2026-10-31|7:00 PM|11:00 PM|Confirmed
   ```

   Cancelled and No-show rows are ignored. A slot that ends after midnight (9:00 PM to 1:00 AM) runs into the next day.

2. For the tournament, refresh `src/tourney.json` with `src/make_tourney.py` from the tournament app's saved data.

3. Rebuild the page:

   ```
   python3 src/build.py src/rows.txt --site . --url https://abri-korte.vercel.app/
   ```

4. Commit and push. Vercel or GitHub Pages redeploys on its own.

## Deploy

- **Vercel:** New Project, import this repo, Framework Preset "Other", no build command, output directory left as the root.
- **GitHub Pages:** Settings, Pages, Deploy from a branch, `main`, `/ (root)`.
