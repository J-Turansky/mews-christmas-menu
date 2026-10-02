# Mews Christmas Menu 2026 – live results

Public, mobile-first page with pie charts of the choice questions on the
[Mews Christmas Menu 2026](https://docs.google.com/forms/d/1bYYuGiLmg0G8M2hOVlAJbyEgsshwjs5tlTpu7wbmLao/edit#responses) Google Form.
It refreshes every 6 hours.

- Live: https://j-turansky.github.io/mews-christmas-menu/
- Repo: `J-Turansky/mews-christmas-menu` (public, GitHub Pages from `main` /root)

## How it works

1. `apps-script/Code.gs` runs in Google Apps Script under your personal Google account. A time trigger calls `sync()` every 6 hours.
2. `sync()` reads the form with `FormApp` and counts every multiple choice, dropdown, checkbox and linear-scale question. It then commits `data.json` to this repo through the GitHub contents API.
3. `index.html` (GitHub Pages) fetches `data.json` and draws the charts as inline SVG.

Only totals are published. Text, date and grid questions are skipped, and "Other" write-ins count as `Other`.

## One-off setup

1. **GitHub token:** go to https://github.com/settings/personal-access-tokens/new, signed in as **J-Turansky**.
   - Name it `mews-christmas-menu sync`. Pick an expiry date after the event (for example 31/01/2027).
   - Repository access: *Only select repositories* → `J-Turansky/mews-christmas-menu`.
   - Permissions: *Contents* → **Read and write**. Generate the token and copy it.
2. **Apps Script:** go to https://script.google.com, signed in with the **personal Google account that owns the form**.
   - Click *New project* and name it `Mews Christmas Menu sync`.
   - Replace the contents of `Code.gs` with `apps-script/Code.gs` from this folder.
   - In *Project Settings* (gear icon), set *Time zone* to `(GMT+00:00) London`. Under *Script properties*, add the property `GITHUB_TOKEN` with the token as its value.
3. Back in *Editor*, choose `setup` in the function dropdown and click **Run**. Approve the Google permissions prompt: *Advanced → Go to project → Allow*. This creates the 6-hourly trigger and does the first sync.
4. Open the live page; it should show the charts within a minute or two (GitHub Pages caches for up to 10 minutes).

## Running it

- Refresh now: in Apps Script, run `sync`.
- Check health: Apps Script → *Executions* (each 6-hourly run is listed; failures are emailed to you by Google).
- Stop: Apps Script → *Triggers* → delete the `sync` trigger.
- Expired token: create a new one as above and replace the `GITHUB_TOKEN` script property.

## Changes

Every change: bump `VERSION` and add a `CHANGELOG` entry (DD/MM/YYYY) at the top of the script in `index.html`. Check that the How to use and Architecture tabs in the **i** dialog still match. Commit and push to `main`; Pages redeploys automatically. Keep the version in `apps-script/Code.gs` in step when the script changes, and paste the new script into Apps Script.

Push with the J-Turansky account: `$env:GH_TOKEN = gh auth token -u J-Turansky`.
