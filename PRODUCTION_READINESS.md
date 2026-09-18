# Is Our App Ready to Go Live? (Explained Simply)

Think of our app like a **house we want people to live in**. Before people move in, we check: is it safe? does everything work? will it fall down?

This doc lists what's **still left to fix** — in very simple words. (Things we already fixed were removed; they live in git history.)

---

## 🎨 How to read this

Traffic-light colors:

- 🔴 **Red = Big danger.** Fix before we open the house.
- 🟠 **Orange = Important.** Fix very soon.
- 🟡 **Yellow = Small.** Fix when we have time.

Each item tells you: **what's wrong**, **why it's bad**, **where** it is, and **how to fix** it.

---

## ✅ Already done (removed from the list)

- Added a **safety net** so one broken part no longer blanks the whole screen (error boundary).
- Stopped shipping our **secret recipe** to users (production source maps turned off).
- Told the project to use a **modern Node (20+)** so tools work.
- **Deleted junk files** (a 541 KB leftover HTML, a wrong extra `index.html`, and dead code files).
- Gave every **"×" close button a name** so screen readers can announce them.
- Removed **copy-pasted code**: the email-check rule and the avatar name-circles now live in one shared place each (`src/utils/validation.ts`, `src/utils/avatar.ts`).
- Cleaned up scattered **debug/error `console` messages** — routed them through the central logger.
- **Woke up the CI robot** 🤖 — the auto-checker now uses `npm` (was the wrong `yarn`) and runs on the `main` branch + every pull request. It runs lint, format, type-check, tests, and a build.

---

## 🔴 BIG DANGERS — fix these first

### 1. Almost no tests 🧪
- **What's wrong:** We have **1 test** for a project with 200+ files. Login, permissions, money — none are tested.
- **Why it's bad:** Like building a plane and never test-flying it. If we change something, we won't know we broke it until a user yells.
- **Where:** Only `src/store/calendar/normalize.test.ts` exists.
- **How to fix:** Write tests for the most important stuff first: login, who-can-do-what, and money. *(The CI robot will run them automatically now.)*

### 2. We're blind in production 🙈
- **What's wrong:** When something breaks for a real user, **nobody gets told**. There's a note in the code that literally says "TODO: add this later."
- **Why it's bad:** If a customer's app crashes, we only find out when they complain — maybe days later.
- **Where:** `src/utils/logger.ts` (lines 41–44).
- **How to fix:** Add a tool like **Sentry** that phones us the moment anything breaks. (Our new safety net is already ready to feed it.)

---

## 🟠 IMPORTANT — fix very soon

### 3. Requests can wait FOREVER ⏳
- **What's wrong:** When the app asks the server for something, there's no time limit. If the server is slow, the app just spins... forever.
- **Why it's bad:** The user stares at a spinner that never stops and thinks the app is frozen.
- **Where:** `src/services/index.ts` (lines 7–12) — no `timeout` set.
- **How to fix:** Add one line: `timeout: 30000` (give up after 30 seconds and show "try again").

### 4. Secret keys kept in an unsafe drawer 🔑
- **What's wrong:** The app stores login "keys" (tokens) in the browser's `localStorage` — a drawer any script can open.
- **Why it's bad:** If a bad script sneaks in, it can steal the keys and pretend to be the user.
- **Where:** `src/store/persistConfig.ts` (lines 6–16).
- **How to fix:** Keep the most powerful key (the "refresh token") in a special locked box (an HttpOnly cookie) scripts can't open.

### 5. Wrong answers can show up 🔀
- **What's wrong:** Search "John," then quickly search "Jane" — sometimes John's results show under Jane. The slow answer arrives late and overwrites the right one.
- **Why it's bad:** Users see the wrong data and don't know it's wrong.
- **Where:** Most `src/store/*/reducers.ts` (only `centres` does it right — copy that pattern).
- **How to fix:** Ignore old answers that arrive late. (`centres` already shows how.)

### 6. We're using an old, unsupported toolbox 🧰
- **What's wrong:** The app is built with "Create React App," which the makers **stopped supporting**. It has 49 known weak spots.
- **Why it's bad:** No one fixes its problems anymore. It'll only get harder.
- **Where:** `package.json` (react-scripts).
- **How to fix:** Move to a modern toolbox called **Vite** — this also fixes most of the 49 weak spots automatically. *(This is a 1–3 day migration, not a quick fix — plan it as its own task.)*

### 7. The lock is only on the *inside* 🚪
- **What's wrong:** The app decides who can do what (permissions) only in the browser. A clever user can trick it.
- **Why it's bad:** Someone could unlock buttons they shouldn't see.
- **Where:** `src/rbac/*`.
- **How to fix:** The **server** must ALSO check permissions on every request — never trust the browser alone. (Please confirm the server does this.)

### 8. Two giant messy rooms 🧹
- **What's wrong:** Two files are HUGE — **2,352 lines** and **1,384 lines**. Too big to understand.
- **Why it's bad:** Changing anything in them is scary and easy to break.
- **Where:** `src/pages/centres/newCentre/NewCentreWizard.tsx` and `src/pages/waitlist/index.tsx`.
- **How to fix:** Split each big room into small tidy rooms (smaller components).

### 9. Clocks show different times on different pages 🕐
- **What's wrong:** Some pages use a shared, correct date helper. Others made their own — so the SAME booking can show a different time on a different page.
- **Why it's bad:** Confusing and can be plain wrong depending on where the user sits in the world.
- **Where:** `tailgate`, `coach`, `maintenance`, `members`, `staff` pages (should all use `src/utils/dateUtils.ts`).
- **How to fix:** Make every page use the one shared date helper.

### 10. Pop-up windows trap keyboard users ⌨️
- **What's wrong:** Pop-ups (modals) don't work well with the keyboard — you can't always press "Esc" to close, and focus escapes behind the pop-up.
- **Why it's bad:** People who can't use a mouse get stuck.
- **Where:** Most modals, e.g. `src/pages/tickets/components/CreateTicketModal.tsx`.
- **How to fix:** Add a shared helper so every pop-up traps focus and closes with "Esc."

---

## 🟡 SMALL — fix when there's time

- **Faint gray text** 👓 — lots of text is too light gray to read easily (`text-gray-400`). Make it a bit darker.
- **Secret settings files are in git** 📁 — the `.env` files are saved in git. Harmless today (just web addresses), but someone could accidentally add a real secret later. Remove them from git.

---

## ⚡ Super Quick Fix still left (under 1 day)

1. Add `timeout: 30000` to the network setup. *(1 line)*

---

## ✅ Simple Checklist

| Do we have it? | Status |
|---|---|
| Safety net for crashes | ✅ Yes |
| Give-up timer on slow requests | ❌ No |
| Someone watching for crashes | ❌ No |
| Tests | ❌ Almost none |
| Working auto-checker (CI) | ✅ Yes (just fixed) |
| Keys stored safely | ⚠️ Not great |
| Fast loading | ⚠️ So-so |
| Works with keyboard/screen readers | ⚠️ Better (buttons named), pop-ups still need work |
| Different settings for dev/live | ✅ Yes |
| Secret recipe hidden (source maps) | ✅ Yes |

---

## 🌟 The good news

It's **not all bad** — the team did many things right:
- The code is **neat and careful** in most places.
- The **login page** is a great example to copy.
- **Error messages (toasts)** show up nicely for users.
- One folder (`centres`) already solves the "wrong answers" problem — we just copy it everywhere.

**So:** finish the few big items above, and this app is ready to open its doors. 🚪✨

---

*This is a simple summary. Full technical details (with exact line numbers and code examples) are available on request.*
