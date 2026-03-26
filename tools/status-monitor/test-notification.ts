const WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

if (!WEBHOOK_URL) {
  console.error("SLACK_WEBHOOK_URL 환경변수가 필요합니다.");
  process.exit(1);
}

const INDICATOR_ICON = {
  none: ":large_green_circle:",
  minor: ":large_yellow_circle:",
  major: ":red_circle:",
  critical: ":rotating_light:",
};

const INDICATOR_LABEL = {
  none: "Operational",
  minor: "Minor",
  major: "Major",
  critical: "Critical",
};

function formatKST(date: Date): string {
  return date.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

const now = new Date();

// 모든 서비스 테스트
const services = [
  {
    name: "GitHub",
    status: "critical" as const,
    statusUrl: "https://www.githubstatus.com",
    description: "Actions, API Requests, Git Operations - Major System Outage",
  },
  {
    name: "Notion",
    status: "major" as const,
    statusUrl: "https://www.notion-status.com",
    description:
      "Degraded Performance - Some users may experience slow page loads",
  },
  {
    name: "AWS",
    status: "critical" as const,
    statusUrl: "https://health.aws.amazon.com/health/status",
    description:
      "[Bahrain] Increased Connectivity Issues and API Error Rates; [UAE] Increased Error Rates",
  },
  {
    name: "API Gateway (Seoul)",
    status: "major" as const,
    statusUrl: "https://health.aws.amazon.com/health/status",
    description: "Increased API error rates in AP-NORTHEAST-2 region",
  },
  {
    name: "API Gateway (Tokyo)",
    status: "minor" as const,
    statusUrl: "https://health.aws.amazon.com/health/status",
    description:
      "Elevated latencies for some API calls in AP-NORTHEAST-1 region",
  },
  {
    name: "Slack",
    status: "major" as const,
    statusUrl: "https://slack-status.com",
    description:
      "Messaging - Some users may experience delays in sending messages",
  },
];

const allBlocks = services.flatMap((service) => {
  const icon = INDICATOR_ICON[service.status];
  const label = INDICATOR_LABEL[service.status];
  const mention =
    service.status === "critical"
      ? "<!here>"
      : service.status === "major"
        ? "<!here>"
        : "";

  return [
    ...(mention
      ? [{ type: "section", text: { type: "mrkdwn", text: mention } }]
      : []),
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${icon} ${service.name} - ${label} Incident`,
      },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Service:*\n${service.name}` },
        { type: "mrkdwn", text: `*Status:*\n${icon} ${label}` },
        {
          type: "mrkdwn",
          text: `*Previous:*\n${INDICATOR_ICON.none} ${INDICATOR_LABEL.none}`,
        },
        { type: "mrkdwn", text: `*Detected At:*\n${formatKST(now)}` },
        {
          type: "mrkdwn",
          text: `*Status URL:*\n<${service.statusUrl}|${service.statusUrl}>`,
        },
      ],
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Description:*\n${service.description}`,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Status Page" },
          url: service.statusUrl,
        },
      ],
    },
    { type: "divider" },
  ];
});

const response = await fetch(WEBHOOK_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ blocks: allBlocks }),
});

if (response.ok) {
  console.log("✅ 모든 서비스 테스트 알림 전송 완료!");
  console.log("   - GitHub (Critical)");
  console.log("   - Notion (Major)");
  console.log("   - AWS (Critical)");
  console.log("   - API Gateway Seoul (Major)");
  console.log("   - API Gateway Tokyo (Minor)");
  console.log("   - Slack (Major)");
} else {
  console.error("❌ 알림 전송 실패:", await response.text());
}

export {};
