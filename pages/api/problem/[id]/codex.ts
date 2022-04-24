import { NextApiRequest, NextApiResponse } from "next";
import getRawBody from "raw-body";
import { getUser } from "../../../../lib/util";
import { Configuration, OpenAIApi } from "openai";
import prisma from "../../../../lib/prisma";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Object>
) {
  const [user, body] = await Promise.all([getUser({ req }), getRawBody(req)]);
  if (!user || req.method !== "POST" || !body) {
    res.status(400).json({});
    return;
  }
  try {
    const rawPrompt = body.toString("utf-8");
    const prompt = `/*
${rawPrompt}
*/

SELECT`;

    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);
    const response = await openai.createCompletion("code-davinci-002", {
      prompt,
      temperature: 0.1,
      max_tokens: 256,
      top_p: 1,
      best_of: 3,
      frequency_penalty: 0,
      presence_penalty: 0,
      stop: ["\n\n", ";", "--", "/*"],
    });
    let answer = response.data.choices?.[0]?.text ?? "";
    if (answer) {
      answer = "SELECT" + answer;
    }
    await prisma.codexPrompt.create({
      data: {
        prompt: rawPrompt,
        answer,
        userId: user.id,
        problemId: req.query.id as string,
      },
    });
    res.status(200).json({ answer });
  } catch (e) {
    console.error("[codex] Error: ", e);
    res.status(400).json({ error: String(e) });
  }
}
