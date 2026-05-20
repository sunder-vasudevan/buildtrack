# BuildTrack — Project Standards

## Security Standards (mandatory for this project and all future apps)

These apply to every repository. Treat any deviation as a bug to fix before merging.

---

### 1. Branch Protection (manual — GitHub UI)

Must be configured on `main` for every repo:

- Require pull request before merging (no direct pushes)
- Require at least 1 approval
- Dismiss stale reviews when new commits are pushed
- Disallow force pushes
- Do not allow deletion of `main`

Path: **Settings → Branches → Add branch ruleset**

---

### 2. GitHub Actions — Permissions & SHA pinning

Every workflow file must have:

```yaml
permissions:
  contents: read   # deny-all default; grant extras per job only if needed
```

Every `uses:` line must reference a full commit SHA, not a mutable tag:

```yaml
# Good
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2

# Bad — tag is mutable, can be hijacked
- uses: actions/checkout@v4
```

Dependabot (configured in `.github/dependabot.yml`) keeps SHAs current automatically.

---

### 3. Dependency Management

- `.npmrc` must contain `save-exact=true` so installs pin exact versions
- `vercel.json` (or equivalent deploy config) must run `npm ci && npm audit --audit-level=high` as the install command to block vulnerable packages at deploy time
- All PRs against `main` run the Dependency Review Action (`.github/workflows/dependency-review.yml`) which blocks high/critical new vulnerabilities

---

### 4. Secrets & Credentials

- No secrets committed to code — ever. Use environment variables and the platform's secret store (GitHub Secrets, Vercel env vars, etc.)
- After any suspected GitHub infrastructure breach: rotate all secrets stored in GitHub Secrets immediately
- Enable **Secret Scanning** + **Push Protection** on every repo: Settings → Security → Secret scanning
- Periodically audit: Settings → Deploy keys and github.com/settings/tokens — revoke anything unused

---

### 5. Workflows to include in every new repo

Copy these from `.github/workflows/` in this repo:

| File | Purpose |
|---|---|
| `audit.yml` | Runs `npm audit` on every push and PR |
| `dependency-review.yml` | Blocks PRs that introduce high/critical vulnerabilities |

And in `.github/dependabot.yml` include both `npm` and `github-actions` ecosystems.

---

### 6. Incident Response checklist

If a GitHub-level breach is announced:

1. Rotate all secrets in GitHub Secrets and re-deploy
2. Revoke and reissue all personal access tokens and deploy keys
3. Check Settings → Security log for unexpected logins or OAuth grants
4. Check Settings → Sessions — revoke unrecognised sessions
5. Verify no unexpected collaborators were added (Settings → Collaborators)
6. Verify no unexpected webhooks were added (Settings → Webhooks)
7. Review recent commits and Actions run logs for anomalies
