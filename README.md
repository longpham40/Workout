# Train & Eat

A workout and meal-planning web app made for iPhone. It's plain HTML, CSS and JavaScript, with no frameworks and no build step.

## Run it on your PC

You need Node.js installed. Open a terminal in this folder and run:

```
node serve.js
```

Open http://localhost:8080 in your browser. Stop the server with `Ctrl+C`.

## Try it on your iPhone (same Wi-Fi)

1. Run `node serve.js`. It prints a **Phone** address, like `http://192.168.1.20:8080`.
2. Open that address in Safari on your iPhone. If Windows asks about the firewall, allow access on **private** networks.

This is fine for testing. Offline mode needs https, so it only works once the app is hosted (see below).

## Put it online (recommended)

Host the `workout-app` folder on a free https host such as GitHub Pages. Then, in Safari on your iPhone:

1. Open the address.
2. Tap **Share**.
3. Tap **Add to Home Screen**.

It then opens full screen like an app and works without signal.

## Chat (coach)

The **Chat** tab lets you ask a coach about training and food. It answers questions only; it never changes your plan or data. Answers come from Claude through a small server function, `api/chat.mjs`, so Chat works on the **Vercel** address only, not on GitHub Pages.

To switch it on:

1. Get an API key at [platform.claude.com](https://platform.claude.com). Each question costs a small amount, so set a monthly spend limit there.
2. In Vercel, open the project, then go to **Settings → Environment Variables**.
3. Add `ANTHROPIC_API_KEY` with your key, then **redeploy** (Deployments → ⋯ → Redeploy).

The key stays on Vercel's server and never reaches the phone. When someone chats, their question and profile basics (goal, targets, program) are sent along with it. The model and the coach's instructions are at the top of `api/chat.mjs`.

To try Chat on your PC, run `npm install` once, set the key in the terminal (`$env:ANTHROPIC_API_KEY="..."` in PowerShell), then run `node serve.js`.

## Updating

- **Text and content:** edit the files in `data/`:
  - `data/workouts.js`: training types, levels and safety tips
  - `data/exercises.js`: every exercise's steps, safety tips and easier/harder versions
  - `data/programs.js`: the 12 programs. Each exercise line reads `rx('exercise-id', sets, 'reps', rest seconds, 'optional note')`.
  - `data/body-areas.js`: the Upper body and Lower body workouts (gym, home and calisthenics at each level), written the same way.
  - `data/exercise-photos.js`: which photo in `images/exercises/` goes with each exercise. To add your own, save `name-0.jpg` (start) and `name-1.jpg` (finish) there and add a line.
  - `data/recipes.js`: recipes. Ingredients are `[amount, 'unit', 'item']` for one portion, so the app can scale them.
  - `data/meal-plans.js`: the sample days for each goal, plus nutrition tips.
- **Look:** colours are at the top of `css/styles.css`.
- **Screens:** each screen is a function in `js/screens.js`.

After an edit, refresh the page. Once the app is hosted, upload the changed files. The app checks for new files each time it opens with signal.

If you add a **new file**, also add it to the `APP_FILES` list in `sw.js` so it works offline.

After editing anything in `data/`, run `node tools/check.js`. It reports any exercise, photo or recipe that something points at but doesn't exist.

## Your data

Everything you save stays on the phone, in the browser's storage for this app. That includes your profile, workouts and favourites. Use **Settings → Export backup** now and then, and before changing phones.

## Files

| Path | What it does |
| --- | --- |
| `index.html` | Page frame, tab bar, script list |
| `css/styles.css` | All styling, light and dark mode |
| `data/` | Workout and meal content you can edit |
| `js/store.js` | Saving and loading on the device |
| `js/ui.js` | Icons, units, formatting helpers |
| `js/nutrition.js` | Calorie and protein targets |
| `js/train.js` | Programs, training days, exercise pages, library |
| `js/session.js` | Workout in progress, logging, personal bests, history |
| `js/timer.js` | Rest and hold countdown bar |
| `js/eat.js` | Meal plan, swaps, recipe library and recipe pages |
| `js/progress.js` | Weigh-ins, charts, personal bests, favourites |
| `js/chat.js` | Chat screen: asks the coach and shows answers as they arrive |
| `api/chat.mjs` | Server function for Chat (runs on Vercel, holds the API key) |
| `js/charts.js` | Line and bar charts with tap-for-value tooltips |
| `js/screens.js` | Today, Eat, Progress, Settings |
| `js/app.js` | Switches screens based on the address |
| `sw.js`, `manifest.webmanifest`, `icons/` | Home Screen install and offline use |
| `serve.js` | Small local web server for testing |
| `package.json` | Lists the one package Chat needs; Vercel installs it |
| `images/exercises/` | Exercise photos from [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public domain) |
