import "dotenv/config";
import express from "express";
import {
  LineBotClient,
  middleware,
} from "@line/bot-sdk";

const channelSecret = process.env.LINE_CHANNEL_SECRET;
const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

if (!channelSecret || !channelAccessToken) {
  throw new Error(
    "LINE_CHANNEL_SECRET と LINE_CHANNEL_ACCESS_TOKEN を設定してください。"
  );
}

const app = express();
const port = Number(process.env.PORT) || 3000;

const client = LineBotClient.fromChannelAccessToken({
  channelAccessToken,
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.post(
  "/webhook",
  middleware({ channelSecret }),
  async (req, res) => {
    // LINE側へ受信完了を返す
    res.status(200).end();

    const events = req.body.events ?? [];

    await Promise.all(
      events.map(async (event: any) => {
        if (
          event.type !== "message" ||
          event.message.type !== "text"
        ) {
          return;
        }

        try {
          await client.replyMessage({
            replyToken: event.replyToken,
            messages: [
              {
                type: "text",
                text: `メッセージを受信しました！\n内容：${event.message.text}`,
              },
            ],
          });
        } catch (error) {
          console.error("返信に失敗しました:", error);
        }
      })
    );
  }
);

app.listen(port, () => {
  console.log(`LINE Bot server listening on port ${port}`);
});