---
name: archive-doc
description: Retire a documentation file into docs/archive with the standard "Archived" header, fix every inbound link, and record the supersession. Use when a plan or architecture document has fully shipped, was superseded, or must stop being read by agents.
---

# archive-doc

Convention: every archived file starts with a blockquote that says what shipped, what did
not, what supersedes it, and "Do not read or follow this file". `CLAUDE.md` tells agents
never to read `docs/archive/`, so the header is the only thing a human needs.

## 1. Check it really is dead

- Every phase or item is shipped, superseded, or deliberately dropped. If one item is still
  open, **fold** it into the owning live document (`docs/plans/2026-10-project-review/10`–`20`)
  first and only then archive the source.
- No normative rule lives only here. Rules move to `CLAUDE.md` or `docs/rules/*.md` before
  archiving.

## 2. Move

```
git mv docs/<path>/<file>.md docs/archive/<file>.md            # or a dated subfolder
```

Keep the original file name so git history follows. A folder of related files goes to
`docs/archive/<yyyy-mm-topic>/` (pattern: `docs/archive/2026-09-stability-performance/`).
`git mv` is a working-tree rename, not a commit; still mention it so the owner can review.

## 3. Header (prepend, then a `---` rule, then the original text unchanged)

```markdown
> **Archived <YYYY-MM-DD>.** Shipped: <items>. Not shipped: <items and where they now live>.
> Superseded by `../plans/2026-10-project-review/<doc>.md`. Do not read or follow this file.

---
```

For an untrimmed original whose trimmed successor is live:

```markdown
> **Archived <YYYY-MM-DD>.** Original, untrimmed version. The live document is
> `../../plans/2026-10-project-review/<doc>.md`. Do not read or follow this file.

---
```

Relative links in the header must resolve from the archive location.

## 4. Fix inbound references

```
grep -rn "<file>.md" --include=*.md --include=*.ts --include=*.tsx . | grep -v node_modules | grep -v "^./docs/archive/"
```

Typical hits: `docs/README.md`, `00-index.md` §8, the `> Folded from` lines of `10`–`20`,
guard-test comments (`apps/web/src/test/guards/*.test.ts`), `docs/rules/design_system.md`
pointers. Point each to the live successor; never leave a link into `docs/archive/` from a
live document except the index's own Archive paragraph.

## 5. Record

- `docs/README.md` → Archive paragraph stays generic; do not list files.
- If the archive closes a programme or changes a decision, one dated line in
  `docs/decision_log.md`.
- If the archived file was a plan document, update `00-index.md` §8 (status column) with
  `/plan-status`.

## 6. Verify

```
npx prettier --check docs/**/*.md
```

Then check links from the reading path resolve (CLAUDE.md, docs/README.md, rules, 00/01, 10–20)
with a quick script over `](…)` targets. Report the moved paths and every link you changed.
