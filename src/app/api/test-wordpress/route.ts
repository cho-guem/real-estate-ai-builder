import axios from "axios";
import https from "https";

export async function GET() {

  const username = process.env.WORDPRESS_USERNAME!;
  const password = process.env.WORDPRESS_APP_PASSWORD!;
  const siteUrl = process.env.WORDPRESS_URL!;

  const credentials = Buffer.from(
    `${username}:${password}`
  ).toString("base64");

  const agent = new https.Agent({
    rejectUnauthorized: false,
  });

  try {

    const response = await axios.post(
      `${siteUrl}/wp-json/wp/v2/pages`,
      {
        title: "AI 자동 생성 테스트",
        content: "<h1>자동 생성 성공</h1><p>AI가 만든 페이지입니다.</p>",
        status: "publish",
      },
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
        httpsAgent: agent,
      }
    );

    return Response.json({
      success: true,
      data: response.data,
    });

  } catch (error: any) {

    return Response.json({
      success: false,
      error: error.message,
      details: error.response?.data,
    });

  }

}