## 1. Change inventory and base resolution

- [x] 1.1 Resolve in-scope Git roots from OpenSpec repository/path scope, with OSI seed roots as a marked fallback.
- [x] 1.2 Inventory committed changes from each root's selected base to `HEAD`, plus staged, unstaged, and untracked non-ignored paths; preserve both sides of renames.
- [x] 1.3 Add per-root base overrides and deterministic default-branch discovery; never select the current feature branch's upstream as the base solely because it exists.
- [x] 1.4 Report a root's committed comparison as incomplete when no unique base resolves, while continuing to review local changes.

## 2. Coverage review and reporting

- [x] 2.1 Reconcile the full in-scope changed-path inventory with OSI seeds/history and review every changed path absent from that evidence.
- [x] 2.2 Respect explicit out-of-scope boundaries and normalize paths consistently across nested Git roots.
- [x] 2.3 Update `/osi-impact` reporting to distinguish possible implementation gaps from unverified tasks and prevent unsupported “no known omissions” claims.

## 3. Distribution and verification

- [x] 3.1 Update the Cursor command template to document optional per-repository base overrides.
- [x] 3.2 Extend `tests/init.test.ts` to verify `osi init` installs the updated skill and command and preserves the completeness-review safeguards.
- [x] 3.3 Validate representative cases: an in-scope changed path absent from OSI evidence, a feature branch tracking its remote counterpart, untracked files, an out-of-scope change, and an unresolved base.
- [x] 3.4 Run `npm test` and `npm run fmt:check`.
