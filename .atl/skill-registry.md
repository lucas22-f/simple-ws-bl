# Skill Registry — tienda web simple moderna

Generated: 2026-05-19
Artifact store: engram
Project root: `C:\Users\lucas\OneDrive\Documentos\Tienda web Simple moderna`

## Project Snapshot

- Repository currently contains only `.git/` metadata and this generated `.atl/skill-registry.md`.
- No project source files or package manifests were detected.
- No `openspec/` directory was created, per `artifact_store=engram`.
- Git commands are currently blocked by Git dubious ownership because the repo owner SID differs from the current user SID.

## Convention Sources

- No project convention files were found on disk: `AGENTS.md`, `agents.md`, `CLAUDE.md`, `.cursorrules`, `GEMINI.md`, `copilot-instructions.md`.
- Runtime thread instructions still apply: short answers by default, Rioplatense Spanish when Spanish is used, conventional commits only, no AI attribution.

## User Skills Trigger Table

| Skill | Trigger | Source |
|---|---|---|
| branch-pr | creating/opening/preparing PRs | `C:\Users\lucas\.codex\skills\branch-pr\SKILL.md` |
| chained-pr | PRs over 400 lines, stacked PRs, review slices | `C:\Users\lucas\.codex\skills\chained-pr\SKILL.md` |
| cognitive-doc-design | guides, READMEs, RFCs, onboarding, architecture, review docs | `C:\Users\lucas\.codex\skills\cognitive-doc-design\SKILL.md` |
| comment-writer | PR feedback, issue replies, reviews, Slack/GitHub comments | `C:\Users\lucas\.codex\skills\comment-writer\SKILL.md` |
| go-testing | Go tests, coverage, Bubbletea teatest, golden files | `C:\Users\lucas\.codex\skills\go-testing\SKILL.md` |
| issue-creation | GitHub issues, bug reports, feature requests | `C:\Users\lucas\.codex\skills\issue-creation\SKILL.md` |
| judgment-day | judgment day, dual/adversarial review, juzgar | `C:\Users\lucas\.codex\skills\judgment-day\SKILL.md` |
| skill-creator | new skills, agent instructions, AI usage patterns | `C:\Users\lucas\.codex\skills\skill-creator\SKILL.md` |
| work-unit-commits | implementation, commit splitting, chained PRs | `C:\Users\lucas\.codex\skills\work-unit-commits\SKILL.md` |

## Compact Rules

### branch-pr
- Every PR must link an approved issue; blank PRs without issue linkage are invalid.
- Every PR must have exactly one `type:*` label.
- Use branch names shaped as `type/description`, lowercase, no spaces.
- Use conventional commits only.
- PR body needs issue link, one PR type, summary, changes table, test plan, and checklist.

### chained-pr
- Split PRs over 400 changed lines unless `size:exception` is explicitly accepted.
- Keep each PR to one deliverable work unit with tests/docs included.
- State dependencies, out-of-scope items, and follow-up work in each chained PR.
- Use stacked PRs for independently landable slices; use feature branch chain when integration must happen before main.
- Do not mix chain strategies after one is chosen.

### cognitive-doc-design
- Lead with the answer, then disclose details progressively.
- Chunk docs into small sections and prefer tables/checklists/templates over dense prose.
- Make review paths explicit: what to review first, what is out of scope, and how to verify.
- Keep docs outcome-oriented and easy to scan.

### comment-writer
- Start with the actionable point, not a recap.
- Be warm, direct, and short, usually 1–3 paragraphs or tight bullets.
- Explain the technical why when asking for a change.
- Match the thread language; in Spanish use natural Rioplatense voseo.
- Avoid em dashes.

### go-testing
- Prefer table-driven tests with `t.Run` for multiple cases.
- Test behavior and state transitions, not implementation trivia.
- Use `t.TempDir()` for filesystem tests.
- Keep external/slow integration tests skippable with `testing.Short()`.
- Golden files must be deterministic and rerun without `-update` after updates.

### issue-creation
- Search for duplicate issues before creating one.
- Use a template; blank issues are disabled.
- New issues get `status:needs-review`; PRs require maintainer-added `status:approved`.
- Questions belong in Discussions, not issues.

### judgment-day
- Use two blind judges in parallel with identical target and criteria.
- Resolve and inject project compact rules before judge/fix prompts.
- Confirm issues only when both judges find the same critical/real warning.
- Ask before fixing Round 1 confirmed issues.
- Re-judge after fixes; terminal states are only APPROVED or ESCALATED.

### skill-creator
- Skills are runtime instruction contracts, not tutorials.
- Keep `SKILL.md` concise; move examples/details into `assets/` or `references/`.
- Frontmatter requires `name`, one-line quoted `description`, license, author, version.
- Use sections: Activation Contract, Hard Rules, Decision Gates, Execution Steps, Output Contract, References.
- Do not add a Keywords section.

### work-unit-commits
- Commit by deliverable work unit, not by file type.
- Keep tests with the code they verify and docs with the user-visible change.
- Each commit should tell a reviewer why it exists and be rollback-friendly.
- If SDD forecasts >400 changed lines, group commits into chained PR slices before implementation.

## Detection Notes

- `sdd-*`, `_shared`, and `skill-registry` skills were intentionally excluded from this registry.
- Duplicate skills across Cursor/Copilot/Codex were deduplicated in favor of Codex-local sources for this session.
