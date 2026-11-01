# Feature: GitHub Actions to npm

Requested: fix CI and connect npm publication to GitHub Actions; explain repeat releases.
Repository confirmed through GitHub: johnasblasco/vibe-code, public, main default branch.

- Preserve all nine personas, budgets, safety assertions, timeouts, dependency versions and
  the private development workspace. Add repository metadata to the staged public package.
- Fix observed prerequisites: PyYAML before tests, explicit setup-python interpreter for
  Windows reference tests, physical runner temp folders for macOS's strict state paths.
  Keep symlink refusal in application code and all reference comparisons unchanged.
- Make CI reusable. On a published stable GitHub Release, run the complete OS matrix first.
  Publish only in the intended repository and only after every check succeeds.
- Use GitHub-hosted Ubuntu, exact existing action commits, ignored install scripts, no cache
  in the publishing job, and job-scoped id-token write permission with npm trusted publishing.
- Require exact stable v<package version> tag, lock/root version match, repository metadata,
  release event and checked-out SHA before preparing. Validate assets, pack inventory and
  checksums, unpack and smoke-test the actual tarball, then publish that path with provenance.
- Do not freeze release tests to 0.1.0: compare the packed version to the authoritative manifest
  and independently test 0.1.0/0.1.1 identity checks. Keep the npm-12 layout fixture at 0.1.0.
- Document npm trust settings, initial manual bootstrap if needed, and version/tag release steps.
  No new package installations, tokens, commits, pushes or live publication during local checks.
