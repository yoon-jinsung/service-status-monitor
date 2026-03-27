# Service Status Monitor

**[English](README.md)** · [日本語](README.ja.md) · [한국어](README.ko.md)

A monitoring service that **automatically detects** outages and status changes of external SaaS services your team depends on (GitHub, Notion, AWS, Slack) and delivers **real-time alerts to Slack**.

## Key Values

- **Fast incident detection** — Detects external service outages within 5 minutes
- **Zero cost** — Operates within GitHub Actions free tier ($0/month)
- **No infrastructure** — Runs entirely on a GitHub repository, no AWS/server needed
- **Code-managed** — Monitoring config, logic, and history all version-controlled in Git
- **Precise schedule** — Triggered exactly every 5 minutes via cron-job.org

## Architecture

```
cron-job.org (triggers workflow_dispatch every 5 min)
  → GitHub Actions
      ├─ Load config/services.json (monitoring targets)
      ├─ Fetch each service status API in parallel
      ├─ Compare with state/status.json to detect changes
      ├─ On change → Send Slack Webhook notification
      ├─ Append incident history to logs/incidents.json
      └─ Update state/status.json → Git commit & push
```

## Monitored Services

| Service             | Status Page           | Type                 |
| ------------------- | --------------------- | -------------------- |
| GitHub              | githubstatus.com      | Atlassian Statuspage |
| Notion              | notion-status.com     | Atlassian Statuspage |
| AWS                 | health.aws.amazon.com | AWS Health API       |
| API Gateway (Seoul) | status.aws.amazon.com | AWS RSS              |
| API Gateway (Tokyo) | status.aws.amazon.com | AWS RSS              |
| Slack               | slack-status.com      | Custom API           |

## Project Structure

```
.github/workflows/
  status-monitor.yml       # workflow_dispatch (triggered by cron-job.org)
  keepalive.yml            # Prevent 60-day inactivity deactivation

tools/status-monitor/
  check.ts                 # Main execution script
  test-notification.ts     # Test notification script
  src/
    types.ts               # Shared type definitions
    config.ts              # Config loader
    poller.ts              # Status API polling
    parsers/
      statuspage.ts        # Atlassian Statuspage parser
      slack.ts             # Slack custom API parser
      aws.ts               # AWS Health API parser
      aws-rss.ts           # AWS RSS feed parser
    detector.ts            # Status change detection
    notifier.ts            # Slack Webhook notifications
    state.ts               # state/status.json read/write
    logger.ts              # Incident history logging

config/services.json       # Monitoring target configuration
state/status.json          # Last status snapshot (managed via Git commits)
logs/incidents.json        # Incident history (append-only)
```

## Setup

### 1. Create Slack Incoming Webhook

1. [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → From scratch
2. Features → **Incoming Webhooks** → On
3. **Add New Webhook to Workspace** → Select `#ce-service-status-monitor` channel
4. Copy the generated Webhook URL

### 2. Register GitHub Secrets

Repository **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Name                | Value                     |
| ------------------- | ------------------------- |
| `SLACK_WEBHOOK_URL` | Webhook URL copied above  |

### 3. Configure cron-job.org (Precise 5-minute interval)

1. Create an account and log in at [cron-job.org](https://console.cron-job.org/)
2. Click **Create cronjob**
3. Settings:
   - **Title**: `Service Status Monitor`
   - **URL**: `https://api.github.com/repos/yoon-jinsung/service-status-monitor/actions/workflows/status-monitor.yml/dispatches`
   - **Schedule**: Every 5 minutes
   - **Request Method**: `POST`
   - **Headers**:
     - `Authorization`: `Bearer <GITHUB_PAT>`
     - `Content-Type`: `application/json`
   - **Request Body**: `{"ref":"main"}`

4. Create GitHub PAT:
   - GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens**
   - Repository: select `service-status-monitor` only
   - Permissions: **Actions** → Read and Write

### 4. Verify

GitHub Actions tab → **Service Status Monitor** → **Run workflow** → Confirm Slack notification is received

## Slack Notification Examples

### Incident Detected

> :red_circle: **Notion - Major Incident**
>
> Status: Major System Outage
> Detected At: Mar 26, 2026, 15:30:00 KST
> Previous: :large_green_circle: Operational → Current: :red_circle: Major

### Recovered

> :large_green_circle: **Notion - Recovered**
>
> Status: All Systems Operational
> Recovered At: Mar 26, 2026, 16:10:00 KST
> Previous: :red_circle: Major

### Status Mapping

| Status   | Icon                  | Mention    |
| -------- | --------------------- | ---------- |
| none     | :large_green_circle:  | —          |
| minor    | :large_yellow_circle: | —          |
| major    | :red_circle:          | `@here`    |
| critical | :rotating_light:      | `@channel` |

## Adding a New Service

Add an entry to the `services` array in `config/services.json`:

```json
{
  "name": "My Service",
  "type": "statuspage",
  "baseUrl": "https://status.example.com",
  "enabled": true
}
```

For AWS-specific services, use `type: "aws_rss"` with a `statusUrl` pointing to the RSS feed.

## Error Handling

| Scenario              | Behavior                                            |
| --------------------- | --------------------------------------------------- |
| API timeout (10s)     | Skip service, increment `consecutiveFailures`       |
| HTTP 4xx/5xx          | Same as above                                       |
| 3 consecutive failures| Send "monitoring failure" alert to Slack            |
| JSON parse error      | Skip service                                        |

## Cost

| Item                          | Cost                                      |
| ----------------------------- | ----------------------------------------- |
| GitHub Actions (public repo)  | Free (unlimited)                          |
| GitHub Actions (private repo) | Free (uses ~720 of 2,000 free min/month)  |
| Slack Incoming Webhook        | Free                                      |
| **Total**                     | **$0/month**                              |

## Local Execution

```bash
cd tools/status-monitor
npm install
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/... npx tsx check.ts
```
