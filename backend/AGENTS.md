undefined
## Code Review Rules

### Review scope and evidence

- Record the reviewed head SHA and diff/base. Inspect relevant surrounding code and source documents; distinguish changed-code findings from pre-existing issues. Do not claim whole-backend coverage from a branch diff.
- Report a finding only with file/line, a concrete scenario or change-cost impact, the applicable source rule or design principle, and the smallest feasible correction. Prioritize correctness, security, data integrity and maintainability over style. CI passing does not establish architectural quality.

### Design quality without ceremony

- Apply KISS, YAGNI, Boy Scout Rule, Separation of Concerns, Low Coupling, High Cohesion, Law of Demeter, Curly's Law, Principle of Least Astonishment and Least Privilege in context. Flag tangled ownership, hidden side effects, unnecessary dependencies, repeated business rules, accidental privilege or gratuitous abstractions when their impact is demonstrable.
- Do not require one interface per service, a fixed number of classes/methods, or Query/Command splitting in every module. Commands may read for validation or response; queries must remain free of persistence mutations. Judge a proposed split by whether it improves a real responsibility, dependency or transaction boundary without disproportionate complexity.
- Use `docs/13-codex-prompts.md` for the independent review report and the separate PR quality-gate payload. Review is read-only; implementation and reviewer roles remain separate.
