# Reliability Dashboard — Round 4 Plan

You've asked for 18 interlocking sections in a single round, and you've said this is your one shot for a while. Before I spend the round, I need to be straight with you about what's realistic in one turn vs. what I'll have to make judgment calls on, so you're not surprised by the result.

## The honest scope reality

Sections 3 (new data model), 4 (dashboard rewrite), 5 (status logic), 6 (settings), 7 (PM Status), 8 (history), 9 (notifications), 15 (delete), 17 (smart import + templates), 18 (README) are one large, tightly-coupled frontend refactor. **I can do all of that well in one round.** It's mechanical work grounded in a clear spec.

Sections 1, 2, 10, 13, 14 are **backend work**. The current app has no live D1 — `wrangler.toml` still has `REPLACE_ME_WITH_YOUR_D1_ID`, there are no server routes, no `/api/*` handlers, no session middleware. Doing this "properly" means:

- Writing `src/routes/api/auth/{login,register,logout,session}.ts` server routes hitting D1 via the `DB` binding.
- Writing `src/routes/api/users/*`, `api/instruments/*`, `api/tasks/*`, `api/sessions/*` routes.
- PBKDF2 password hashing, HttpOnly cookie sessions, rate-limiting (needs KV or Durable Object — D1 alone is a bad fit for counters), CSP headers.
- Ripping out `auth-store.ts` (localStorage) and rewriting every page to fetch from server routes with proper loading/error states.
- Migrating the Zustand-persisted `store.ts` off localStorage onto D1 too (otherwise `createdBy`, delete, session revocation, and the "bootstrap is truly one-time across devices" guarantee in §1 are all impossible — they all require server-side truth).

That's a second, equally large refactor. **Attempting both in one turn will produce half-broken backend code you can't verify without deploying, plus a rushed frontend.** You explicitly said everything must meet the polish bar — rushing both halves violates that.

## What I recommend for this round

**Do the full frontend refactor + templates + README this round, and scaffold the backend contracts without cutting over.** Concretely:

### Fully implemented this round
1. **§3 New data model** — rewrite `types.ts`, `store.ts`, D1 migration `0002_new_model.sql`, seed/reset paths.
2. **§4 Dashboard** — new KPIs, Progress per Area bar, Equipment donut, Due-soon table, filters incl. Equipment Type.
3. **§5 Status derivation** — pure function + auto-recompute in store; manual `Inprogress` override.
4. **§6 Settings** — Area list, Equipment Type list, PM Frequency per type, Upcoming window; drop health/calibration/criticality.
5. **§7 PM Status page** — rename route, traffic-light grid grounded in latest task per instrument.
6. **§8 Maintenance History** — new columns, filters, CSV export.
7. **§9 Notifications** — trigger on `Behind`, escalation keyed off **Area** (better fit than Equipment Type — Area maps to org units).
8. **§11 Logo alignment** — `items-center` + normalized line-heights in `brand.tsx`.
9. **§12 Liquid-glass rework** — real `backdrop-blur-2xl`, translucent tints, top highlight, layered shadow, motion on dropdowns/dialogs/cards, crossfade on theme toggle. I'll list exact locations in my reply.
10. **§15 Delete** — instruments (cascade PM tasks, with confirm listing count) + PM tasks, from tables + drawer.
11. **§14 createdBy** — captured client-side from current user for now; carries over cleanly when auth moves server-side.
12. **§16 Help & Guide** — full rewrite of both languages for new model + natural Bahasa Indonesia + Register/approval entry.
13. **§17 Smart Import** — new alias dictionary, ignore lists, header-row scan (already there), non-record sheet detection, and **two proper `.xlsx` templates** (styled headers, greyed example rows, column widths) generated via the existing `xlsx` dep and downloadable from Input Data.
14. **§18 README** — full rewrite reflecting all of the above, with honest notes on what's client-side today.

### Scaffolded but not cut over (with a clear TODO in README)
- **§1 Bootstrap check**, **§2 Register/approve**, **§10 Server-side auth + PBKDF2 + HttpOnly cookies + rate limit**, **§13 Sessions panel**.

For these I'll:
- Add the `status` field + Pending Requests UI + Sessions tab UI + Register page + "awaiting approval" login message, all wired to the existing client store so the **UX and flows are complete and testable end-to-end today**.
- Add the D1 schema for `users.status`, `sessions`, PBKDF2 columns.
- Add stub server routes at `src/routes/api/auth/*` with the real PBKDF2 + cookie logic written and unit-safe, gated behind a `USE_SERVER_AUTH` flag that's `false` until you paste a real D1 ID and deploy.
- README section explaining exactly how to flip the flag after `wrangler d1 create` + `wrangler secret put SESSION_SECRET`.

The bootstrap guarantee you asked about in §1 is **not structurally possible in a client-only app** — any localStorage flag can be cleared. I'll make the client check `users.length === 0` (not a flag) so it's at least not bypassable by clearing a single key, and I'll document that the true guarantee lands the moment you deploy with D1 (`SELECT COUNT(*) FROM users`), which the scaffolded server route already does correctly.

### The alternative: full backend cutover this round
If you'd rather I attempt the full server-side auth + D1 cutover in this round, I'll do it, but I need you to accept:
- I cannot verify it end-to-end without a real D1 ID + deploy — I'll be shipping code you have to test on Cloudflare.
- Frontend polish will be shallower because time is split.
- Rate limiting will be best-effort in D1 (no KV binding configured).

## Judgment calls I'll make unless you say otherwise
- **Escalation keyed off Area** (§9) — Area maps to org responsibility better than Equipment Type.
- **Delete cascade** (§15) — deleting an Instrument cascade-deletes its PM Task Records, with a confirm dialog stating the count. Safer than orphaned records.
- **PM Frequency unit list** — `minggu | bulan | tahun` only, matching the real files.
- **"Upcoming" window** default 14 days, editable in Settings.
- **Templates** as `.xlsx` (not CSV) since the team uses Excel and you asked for styled headers.

## What I need from you
**One reply: "go recommended" or "go full backend".** Then I execute the entire round without further questions. If I don't hear back I'll proceed with the recommended path.
