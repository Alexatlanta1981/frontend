# SAAS - HENRY FORD (frontend)

`mackllc-ui`: the React 18 web app for the `mackllc` platform, served by Nginx in a container. CI builds, scans, signs and pushes the image to ECR, then updates the image tag in `gitops` so Argo CD deploys it.

Companion repos: [infra](https://github.com/Alexatlanta1981/infra) (AWS, Terraform, bootstrap scripts), [gitops](https://github.com/Alexatlanta1981/gitops) (desired state), [backend](https://github.com/Alexatlanta1981/backend) (API services).

## Architecture

```
 browser ──► shared ALB ──► "/"    ──► mackllc-ui (Nginx, port 80)
                      └───► "/api" ──► api-gateway (backend)

 push to develop / main
   ci-mackllc-ui.yml: ESLint, Jest, CodeQL, Semgrep, npm audit
        ──► docker build (node:20-alpine ─► nginx:alpine, non-root)
        ──► Trivy ──► push ECR mackllc-ui:sha-<7> ──► Cosign keyless sign
        ──► GitHub App token: commit tag to gitops envs/dev ──► Argo CD syncs

 promote-qa-mackllc-ui.yml / promote-prod-mackllc-ui.yml: move a built tag to qa / prod
```

## Layout

| Path | What it holds |
|---|---|
| `src/`, `public/` | React app. |
| `nginx.conf` | Serves the build and handles SPA routing. |
| `Dockerfile` | Multi-stage build: npm build, then Nginx. |
| `.github/workflows/` | `ci-mackllc-ui.yml`, `promote-qa-mackllc-ui.yml`, `promote-prod-mackllc-ui.yml`. |

Runtime values (`AUTH_BASE_URL`, `ENV`) come from the ConfigMap in `gitops/envs/<env>/values-mackllc-ui.yaml`.

## Running it

```bash
npm install
npm start                          # http://localhost:3000
npm test -- --watchAll=false       # single run (as in CI)
npm test -- --coverage
npm run lint
npm run build                      # outputs build/

docker build -t mackllc-ui:local .
docker run -p 80:80 mackllc-ui:local
```

In CI: push to `develop` or `main` runs the pipeline; promotion is manual dispatch.

Required repo settings: variable `GITOPS_APP_ID` and `GITOPS_REPO`; secrets `GITOPS_APP_PRIVATE_KEY`, `AWS_ACCOUNT_ID`. GitHub App setup: [infra runbook](https://github.com/Alexatlanta1981/infra/blob/main/docs/DEPLOY-RUNBOOK.md).

## Why it is designed this way

- **Static build behind Nginx.** Small image, no Node at runtime.
- **Non-root container.** Reduces blast radius.
- **Layered scanning.** Lint, tests, CodeQL, Semgrep, npm audit and Trivy catch different problems.
- **Immutable `sha-<7>` tags and Cosign signing.** Deployed images are traceable and verifiable.
- **OIDC to AWS, GitHub App to gitops.** No stored keys or personal tokens.
- **CI never touches the cluster.** It commits a tag to `gitops`; Argo CD deploys, and rollback is a revert.
- **Config in the ConfigMap, not the image.** One image runs in every environment.

## Known gaps

- Trivy findings are non-blocking.
- No end-to-end (browser) tests.
