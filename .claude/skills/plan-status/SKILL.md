---
name: plan-status
description: Record that a plan phase, finding or defect shipped (or changed status) in the live review plan without changelog bloat — status header, shipped note with proving test, 00-index tables, bug register ledger, decision log when a rule changed. Use after a task from docs/plans/2026-10-project-review lands.
---

# plan-status

Normative: `docs/plans/2026-10-project-review/00-index.md` §8 ("do not append changelogs").
The live plan is the only plan; `docs/archive/` is never updated.

## 1. Find the owners

Every task comes from one of: `01-review-findings.md` (B-/F-/U-/D-/T- id), a work-breakdown
document `10`–`19` (phase number), or `20-bug-register.md` (B<n>). Identify which, then
update **only** the places below.

## 2. Edits per case

### A phase of `10`–`19` shipped

1. In that document, replace the phase body with a short **Shipped** note: date, one
   sentence of what landed, the proving test file(s). Keep the heading so cross-references
   survive. Delete steps, rationale and alternatives — they are in git history.
2. Update the document's `> **Status (date)**` header line to the new open/shipped set.
3. Update that document's row in `00-index.md` §8 table.
4. Tick any exit-criterion checkbox in `00-index.md` §8 that is now proven; name the proof.

### A finding from `01-review-findings.md` resolved

Change its **Phase** cell to `<n> — resolved <date>` and, if the fix changed the evidence,
one short clause. Do not delete the row. Hotfix items keep `HOTFIX` until the code change
ships.

### A defect in `20-bug-register.md`

Move the row from "Current priorities" to the **Resolved ledger** table (`ID | Resolved |
Outcome`, one sentence). Delete its narrative section. A new defect gets a short section
(Remaining problem, Required outcome, Verification) and a priorities row with a **Next proof**.

### A product or engineering rule changed

- Rule text lives in `CLAUDE.md` (game rules, lifecycle, look & feel, principles) or in the
  relevant `docs/rules/*.md`; edit it there.
- Append a dated entry to `docs/decision_log.md` under **Decided** (newest first) stating
  _what_ and _why_. Move any answered question out of **Still open**.

### Phase of the review programme itself (`00-index.md` §4)

Update the phase row status and the deliverable document number (`03`–`06`); update the
`docs/README.md` live-plan table when a new numbered document lands.

## 3. Style

- Dates are absolute (`2026-10-06`). No "today", "recently", "now".
- Placeholder data only in examples. No author names.
- One line per fact; no "Update:" paragraphs, no emoji, no history inside the document.
- Keep Prettier happy: `npx prettier --check docs/plans/2026-10-project-review/*.md`.

## 4. Do not

- Do not edit anything in `docs/archive/`.
- Do not create new numbered plan documents for routine work; `03`–`06` are the Phase 3–6
  deliverables, `10`–`20` the work breakdown.
- Do not commit; mention the changed files in the report so the owner can review the diff.
