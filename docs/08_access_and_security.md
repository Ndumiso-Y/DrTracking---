# 08 · Access and security

Owner-approved plan (16 Nov 2026):
1. Move the strategic-plan documents out of the repository, keeping a private copy.
2. Put the tracker behind a login while keeping the live page online.
3. Only then decide whether to make the repository private.

## Where things stood
- The repository is public and the live tracker opened for anyone with the link.
- With only the public key from the page, all 13 rows of `dr_tracking` could be read, changed or deleted: row-level security was off and there were no policies.
- Anyone could also create their own account on the Supabase project (sign-ups were open).
- Five confidential documents (one Word file, four PDFs) were in the repository and downloadable from the live site.

## Step 1 · Documents removed (done)
- Exact copies of the five files were handed to the owner.
- The files were deleted from the tip of `main`, `preview` and `redesign/executive-glass-ui`, and the site was redeployed.
- `.gitignore` now ignores `Dr_Tebeila_Strategic_Action_Plan*`, `*.pdf` and `*.docx`.
- **Still true:** earlier commits contain the files. Anyone who knows where to look can fetch them from the public history until the history is rewritten or the repository is made private.

## Step 2 · Login (built and tested, on `preview`; not yet live)
**What it is.** A sign-in screen using Supabase's own email-and-password sign-in. Nothing of the tracker is drawn, and the database is not contacted, until someone signs in. There is a Sign out button; signing out clears the copy of the data kept in that browser.

**Why this kind of login.** The page is a static file in a public repository, so a password or access code checked only inside the page would protect nothing: the data would still be open to anyone holding the public key. Signing in through Supabase gives each request a real identity, which is what lets the database itself refuse everyone else.

**What did not change.** `initApp`, `loadState`, `saveState`, the live-update subscription, status, notes, accountability and export code are byte-for-byte the same (`qa/compare-logic.js`, 45 of 45). The Supabase client simply attaches the signed-in session to the same requests.

**Also changed.** The Supabase and icon libraries are now loaded from `vendor/` (pinned copies, see `vendor/README.md`) instead of public CDNs. A page with a password field should not run code an outside server can change, and the old icon link pointed at "latest".

**Limits, stated plainly**
- The login protects the **data** (statuses, notes, accountability details) only once row-level security is switched on in Supabase (stage 2 below). Until then the screen is a front door on a house with an open window.
- The goal titles, owner names, priorities and narrative are written inside `index.html`, which is in a public repository. The login hides them from someone who opens the link, not from someone who reads the page source or the repository. Only step 3 (a private repository) or moving that content into the database fixes this.
- There is no "forgot password" or "change password" screen yet. The administrator sets and resets passwords in the Supabase dashboard.
- Notes still do not record who wrote them. With individual accounts this is now possible to add.

## Going live without locking anyone out
The order matters. Each stage is safe to stop after.

| Stage | Who | What | Effect |
|---|---|---|---|
| 1 | Owner, in Supabase | Switch off public sign-ups. Create an account for each person who should have access. | None on the live tracker yet. |
| 2 | Owner | Sign in on the preview link with one of those accounts and check the notes are there. | Proves the accounts work before anything changes for the team. |
| 3 | Developer | Publish the login build to `main`. | The live tracker now asks everyone to sign in. |
| 4 | Owner, in Supabase | Run the SQL below to switch on row-level security. | Only signed-in accounts can read or change data. The public key alone gets nothing. |
| 5 | Developer | Confirm from outside that the public key reads 0 rows, and that a signed-in user still sees all notes. | Verified. |

Do **not** run stage 4 before stage 3: the current live page has no login, so it would lose access to the data.

### SQL for stage 4
```sql
alter table public.dr_tracking enable row level security;

create policy "Signed-in team can read"
  on public.dr_tracking for select to authenticated using (true);

create policy "Signed-in team can add"
  on public.dr_tracking for insert to authenticated with check (true);

create policy "Signed-in team can update"
  on public.dr_tracking for update to authenticated using (true) with check (true);
```
There is deliberately no delete policy: the tracker never deletes rows, so after this nobody can delete one through the public interface.

### To undo stage 4
```sql
alter table public.dr_tracking disable row level security;
```

## Step 3 · Private repository (decision pending)
- On GitHub's free plan, making the repository private switches off GitHub Pages, so the live tracker would go offline.
- Options: a paid GitHub plan (Pages works from private repositories), or a free static host that deploys from a private repository (the address would change).
- Making the repository private also hides the old commits that still hold the documents.

## Other open risks
- **No backup** of `dr_tracking` exists. The Free plan keeps none.
- **The project pauses** after about a week without traffic.
- **Notes are inserted into the page without escaping.** Once only signed-in team members can write, the exposure is much smaller, but it should still be fixed.
- **A personal email address** is hard-coded in the page source.
