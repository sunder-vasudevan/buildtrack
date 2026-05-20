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

### 3. Package Manager — use pnpm, not npm

**Why npm is risky ("ghost code" problem)**

npm installs everything into a flat `node_modules` and hoists transitive dependencies to the top level. This means:
- **Phantom dependencies**: your code can accidentally `require()` a package you never declared. If that transitive package is later compromised or removed, your build breaks or executes malicious code you never audited.
- **Install scripts**: `preinstall`/`postinstall`/`prepare` hooks in any package in the tree run arbitrary shell commands during `npm install`. A hijacked transitive dep can exfiltrate secrets, modify source files, or install backdoors at install time.
- **Semver ranges** (`^`, `~`) silently resolve to newer versions on each fresh install unless locked — a window for compromise between lockfile updates.

**Use pnpm instead**

pnpm fixes all three:
- Uses a content-addressable global store + symlinks. Each package can only access what it explicitly declares — phantom dependencies are structurally impossible.
- `--ignore-scripts` is easy to enforce globally; only allow install scripts for explicitly trusted packages.
- Lockfile (`pnpm-lock.yaml`) is stricter and more deterministic than `package-lock.json`.

**Alternatives evaluated**

| Tool | Strengths | When to use |
|---|---|---|
| **pnpm** | Best npm drop-in; strict isolation; fast | Default for all projects |
| **Yarn Berry (PnP)** | Zero node_modules; strictest isolation possible | New projects where all deps support PnP |
| **Bun** | Fastest installs + runtime; built-in bundler | Greenfield projects, not yet production-stable for all Next.js features |
| **Deno** | No node_modules at all; URL imports; built-in permissions sandbox | Non-Next.js server tooling / scripts |

**Standard config for every repo**

```bash
# Install
pnpm install --frozen-lockfile

# Audit
pnpm audit --audit-level=high

# Add a new package (never run install scripts blindly)
pnpm add <pkg> --ignore-scripts
# then inspect the package before re-enabling scripts if needed
```

`vercel.json` install command:
```json
{ "installCommand": "pnpm install --frozen-lockfile && pnpm audit --audit-level=high" }
```

**Additional layer: Socket.dev**

Dependabot and `npm audit` only catch *known* CVEs. Socket.dev detects *new* supply chain attacks by analysing package behaviour (network calls, filesystem access, obfuscated code) before a CVE exists. Install the free GitHub App on every repo: it scans each PR's dependency changes and blocks suspicious packages proactively.

### 4. Dependency Management

- `pnpm-lock.yaml` must be committed and kept up to date — never delete it
- `vercel.json` (or equivalent deploy config) must run `pnpm install --frozen-lockfile && pnpm audit --audit-level=high` as the install command to block vulnerable packages at deploy time
- All PRs against `main` run the Dependency Review Action (`.github/workflows/dependency-review.yml`) which blocks high/critical new vulnerabilities
- Add the **Socket.dev GitHub App** to every repo for proactive supply chain scanning

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
