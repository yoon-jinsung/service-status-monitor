# サービスステータスモニター

[English](README.md) · **[日本語](README.ja.md)** · [한국어](README.ko.md)

チームが依存する外部 SaaS サービス（GitHub、Notion、AWS、Slack など）の障害や状態変化を**自動検知**し、**Slack チャンネルにリアルタイム通知**を送信するモニタリングサービスです。

## 主な特徴

- **素早い障害検知** — 外部サービスの障害を5分以内に検知
- **ゼロコスト** — GitHub Actions の無料枠内で運用（$0/月）
- **インフラ不要** — AWS/サーバー不要、GitHub リポジトリのみで運用
- **コード管理** — モニタリング設定・ロジック・履歴をすべて Git で管理
- **正確なスケジュール** — cron-job.org により正確に5分ごとに実行

## アーキテクチャ

```
cron-job.org（5分ごとに workflow_dispatch をトリガー）
  → GitHub Actions
      ├─ config/services.json を読み込み（監視対象）
      ├─ 各サービスのステータス API を並列呼び出し
      ├─ state/status.json と比較して変化を検知
      ├─ 変化あり → Slack Webhook 通知を送信
      ├─ logs/incidents.json にインシデント履歴を記録
      └─ state/status.json を更新 → Git コミット & プッシュ
```

## 監視対象サービス

| サービス            | ステータスページ      | タイプ               |
| ------------------- | --------------------- | -------------------- |
| GitHub              | githubstatus.com      | Atlassian Statuspage |
| Notion              | notion-status.com     | Atlassian Statuspage |
| AWS                 | health.aws.amazon.com | AWS Health API       |
| API Gateway (Seoul) | status.aws.amazon.com | AWS RSS              |
| API Gateway (Tokyo) | status.aws.amazon.com | AWS RSS              |
| Slack               | slack-status.com      | カスタム API         |

## プロジェクト構造

```
.github/workflows/
  status-monitor.yml       # workflow_dispatch（cron-job.org からトリガー）
  keepalive.yml            # 60日非アクティブによる無効化を防止

tools/status-monitor/
  check.ts                 # メイン実行スクリプト
  test-notification.ts     # テスト通知送信スクリプト
  src/
    types.ts               # 共通型定義
    config.ts              # 設定ローダー
    poller.ts              # ステータス API ポーリング
    parsers/
      statuspage.ts        # Atlassian Statuspage パーサー
      slack.ts             # Slack カスタム API パーサー
      aws.ts               # AWS Health API パーサー
      aws-rss.ts           # AWS RSS フィードパーサー
    detector.ts            # ステータス変化検知
    notifier.ts            # Slack Webhook 通知
    state.ts               # state/status.json 読み書き
    logger.ts              # インシデント履歴記録

config/services.json       # 監視対象の設定
state/status.json          # 最後のステータススナップショット（Git コミット管理）
logs/incidents.json        # インシデント履歴（追記専用）
```

## セットアップ

### 1. Slack Incoming Webhook を作成

1. [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → From scratch
2. Features → **Incoming Webhooks** → On
3. **Add New Webhook to Workspace** → `#ce-service-status-monitor` チャンネルを選択
4. 生成された Webhook URL をコピー

### 2. GitHub Secrets に登録

リポジトリの **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Name                | Value                      |
| ------------------- | -------------------------- |
| `SLACK_WEBHOOK_URL` | コピーした Webhook URL     |

### 3. cron-job.org の設定（正確な5分間隔）

1. [cron-job.org](https://console.cron-job.org/) でアカウントを作成してログイン
2. **Create cronjob** をクリック
3. 設定:
   - **Title**: `Service Status Monitor`
   - **URL**: `https://api.github.com/repos/yoon-jinsung/service-status-monitor/actions/workflows/status-monitor.yml/dispatches`
   - **Schedule**: Every 5 minutes
   - **Request Method**: `POST`
   - **Headers**:
     - `Authorization`: `Bearer <GITHUB_PAT>`
     - `Content-Type`: `application/json`
   - **Request Body**: `{"ref":"main"}`

4. GitHub PAT の作成:
   - GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens**
   - Repository: `service-status-monitor` のみ選択
   - Permissions: **Actions** → Read and Write

### 4. 動作確認

GitHub Actions タブ → **Service Status Monitor** → **Run workflow** で手動実行し、Slack 通知が届くことを確認

## Slack 通知の例

### 障害発生

> :red_circle: **Notion - Major Incident**
>
> Status: Major System Outage
> Detected At: Mar 26, 2026, 15:30:00 KST
> Previous: :large_green_circle: Operational → Current: :red_circle: Major

### 復旧完了

> :large_green_circle: **Notion - Recovered**
>
> Status: All Systems Operational
> Recovered At: Mar 26, 2026, 16:10:00 KST
> Previous: :red_circle: Major

### ステータス別通知

| ステータス | アイコン              | メンション |
| ---------- | --------------------- | ---------- |
| none       | :large_green_circle:  | なし       |
| minor      | :large_yellow_circle: | なし       |
| major      | :red_circle:          | `@here`    |
| critical   | :rotating_light:      | `@channel` |

## サービスの追加方法

`config/services.json` の `services` 配列にエントリを追加します:

```json
{
  "name": "サービス名",
  "type": "statuspage",
  "baseUrl": "https://status.example.com",
  "enabled": true
}
```

AWS 個別サービスの場合は `type: "aws_rss"` を使用し、`statusUrl` に RSS フィードの URL を指定します。

## エラーハンドリング

| シナリオ             | 処理                                              |
| -------------------- | ------------------------------------------------- |
| API タイムアウト (10秒) | 該当サービスをスキップ、`consecutiveFailures` +1 |
| HTTP 4xx/5xx         | 同様に `consecutiveFailures` +1                  |
| 3回連続失敗          | Slack に「モニタリング失敗」通知を送信            |
| JSON パースエラー    | 該当サービスをスキップ                            |

## コスト

| 項目                          | コスト                                    |
| ----------------------------- | ----------------------------------------- |
| GitHub Actions (public repo)  | 無料（無制限）                            |
| GitHub Actions (private repo) | 無料（月 2,000 分中 約 720 分使用）       |
| Slack Incoming Webhook        | 無料                                      |
| **合計**                      | **$0/月**                                 |

## ローカル実行

```bash
cd tools/status-monitor
npm install
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/... npx tsx check.ts
```
