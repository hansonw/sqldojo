import pg from "pg";
import getRawBody from "raw-body";
import { getSolutionColumns } from "../../../../lib/contestDB";
import prisma from "../../../../lib/prisma";
import { getUser } from "../../../../lib/util";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const body = await getRawBody(req);
  if (req.method !== "POST" || !body) {
    res.status(400).json({});
    return;
  }
  const [user, problem] = await Promise.all([
    getUser({ req }),
    prisma.problem.findFirst({ where: { id: req.query.id } }),
  ]);
  if (!user || !problem) {
    return;
  }
  const client = new pg.Client({
    host: process.env.CONTESTANT_HOST,
    user: process.env.CONTESTANT_USER,
    password: process.env.CONTESTANT_PWD,
    database: problem.dbName,
    statement_timeout: 5000,
    query_timeout: 5000,
  });
  try {
    await client.connect();
    const queryBody = body.toString("utf8");
    const [result, solutionColumns] = await Promise.all([
      client.query({ text: queryBody, rowMode: "array" }),
      getSolutionColumns(problem.dbName),
    ]);
    res.status(200).json({
      rows: result.rows.slice(0, 100),
      columns: result.fields.map((x) => x.name),
      solutionColumns,
      count: result.rows.length,
    });
    await prisma.problemQuery.create({
      data: {
        problemId: req.query.id,
        userId: user.id,
        query: queryBody,
      },
    });
  } catch (e) {
    console.error("[query] Error: ", e);
    res.status(200).json({ error: String(e) });
  }
  await client.end();
}
