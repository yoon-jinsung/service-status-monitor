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
    name: "GitHub (테스트)",
    status: "critical" as const,
    statusUrl: "https://www.githubstatus.com",
  },
  {
    name: "Notion (테스트)",
    status: "major" as const,
    statusUrl: "https://www.notion-status.com",
  },
  {
    name: "AWS (테스트)",
    status: "critical" as const,
    statusUrl: "https://health.aws.amazon.com/health/status",
  },
  {
    name: "Slack (테스트)",
    status: "minor" as const,
    statusUrl: "https://status.slack.com",
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
        text: `*Description:*\n⚠️ 이것은 ${service.name} 테스트 알림입니다. 실제 장애가 아닙니다.`,
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
  console.log("   - Slack (Minor)");
} else {
  console.error("❌ 알림 전송 실패:", await response.text());
}

export {};
