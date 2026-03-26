import type { Indicator, StatusChange } from "./types.js";

const INDICATOR_ICON: Record<Indicator, string> = {
  none: ":large_green_circle:",
  minor: ":large_yellow_circle:",
  major: ":red_circle:",
  critical: ":rotating_light:",
};

const INDICATOR_LABEL: Record<Indicator, string> = {
  none: "Operational",
  minor: "Minor",
  major: "Major",
  critical: "Critical",
};

function formatKST(date: Date): string {
  return date.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

function buildDegradedBlocks(change: StatusChange, now: Date) {
  const icon = INDICATOR_ICON[change.current];
  const mention =
    change.current === "critical"
      ? (change.serviceConfig.mentionOnCritical ?? "<!channel>")
      : change.current === "major"
        ? "<!here>"
        : "";

  const mentionBlock = mention
    ? [{ type: "section", text: { type: "mrkdwn", text: mention } }]
    : [];

  const statusPageUrl =
    change.serviceConfig.statusUrl ?? change.serviceConfig.baseUrl;
  const statusUrlField = statusPageUrl
    ? [
        {
          type: "mrkdwn",
          text: `*Status URL:*\n<${statusPageUrl}|${statusPageUrl}>`,
        },
      ]
    : [];
  const buttonBlock = statusPageUrl
    ? [
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Status Page" },
              url: statusPageUrl,
            },
          ],
        },
      ]
    : [];

  return [
    ...mentionBlock,
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${icon} ${change.service} - ${INDICATOR_LABEL[change.current]} Incident`,
      },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Service:*\n${change.service}` },
        {
          type: "mrkdwn",
          text: `*Status:*\n${icon} ${INDICATOR_LABEL[change.current]}`,
        },
        {
          type: "mrkdwn",
          text: `*Previous:*\n${INDICATOR_ICON[change.previous]} ${INDICATOR_LABEL[change.previous]}`,
        },
        { type: "mrkdwn", text: `*Detected At:*\n${formatKST(now)}` },
        ...statusUrlField,
      ],
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Description:*\n${change.description}` },
    },
    ...buttonBlock,
    { type: "divider" },
  ];
}

function buildRecoveredBlocks(change: StatusChange, now: Date) {
  const statusPageUrl =
    change.serviceConfig.statusUrl ?? change.serviceConfig.baseUrl;
  const statusUrlField = statusPageUrl
    ? [
        {
          type: "mrkdwn",
          text: `*Status URL:*\n<${statusPageUrl}|${statusPageUrl}>`,
        },
      ]
    : [];

  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `:large_green_circle: ${change.service} - Recovered`,
      },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Service:*\n${change.service}` },
        { type: "mrkdwn", text: `*Status:*\n:large_green_circle: Recovered` },
        {
          type: "mrkdwn",
          text: `*Previous:*\n${INDICATOR_ICON[change.previous]} ${INDICATOR_LABEL[change.previous]}`,
        },
        { type: "mrkdwn", text: `*Recovered At:*\n${formatKST(now)}` },
        ...statusUrlField,
      ],
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Description:*\n${change.description}` },
    },
    { type: "divider" },
  ];
}

function buildBlocks(change: StatusChange, now: Date) {
  const isRecovered = change.current === "none";
  return isRecovered
    ? buildRecoveredBlocks(change, now)
    : buildDegradedBlocks(change, now);
}

export async function sendNotifications(
  changes: StatusChange[],
  webhookUrl: string,
): Promise<void> {
  if (changes.length === 0) return;

  const now = new Date();
  const blocks = changes.flatMap((change) => buildBlocks(change, now));

  const payload = { blocks };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `Slack webhook request failed: ${response.status} ${response.statusText}`,
    );
  }
}
