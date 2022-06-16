import pg from "pg";
import format from "pg-format";
import getRawBody from "raw-body";
import prisma from "../../../../lib/prisma";
import { getUser } from "../../../../lib/util";

export const config = {
  api: {
    bodyParser: false,
  },
};

function _stringify(row, checkCols) {
  const cols = [];
  for (const col of checkCols) {
    cols.push(String(row[col]));
  }
  return cols.join("\t");
}

export default async function handler(req, res) {
  const body = await getRawBody(req);
  if (req.method !== "POST" || !body) {
    res.status(400).json({});
    return;
  }
  const [user, problem] = await Promise.all([
    getUser({ req }),
    prisma.problem.findFirst({
      where: { id: req.query.id },
      include: { competition: { select: { endDate: true } } },
    }),
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
    const queryBody = body.toString("utf-8");
    const [result, expected] = await Promise.all([
      client.query(queryBody),
      prisma.$queryRawUnsafe(
        format(
          "SELECT * FROM solutions.%I ORDER BY sort_id ASC",
          problem.dbName
        )
      ),
    ]);
    let correct = true;
    if (result.rows.length !== expected.length) {
      console.log(
        `Row count mismatch: ${result.rows.length} vs ${expected.length}`
      );
      correct = false;
    } else {
      let checkCols = Object.keys(expected[0]).filter((x) => x !== "sort_id");
      if (expected[0]["sort_id"] == null) {
        const expectedOrder = expected.map((r) => _stringify(r, checkCols));
        const resultOrder = result.rows.map((r) => _stringify(r, checkCols));
        expectedOrder.sort();
        resultOrder.sort();
        correct =
          expectedOrder.join("\n").toLowerCase() ==
          resultOrder.join("\n").toLowerCase();
      } else {
        for (let i = 0; i < result.rows.length && correct; i++) {
          for (let col of checkCols) {
            if (String(result.rows[i][col]) !== String(expected[i][col])) {
              console.log(
                `mismatch at row ${i} col ${col}: ${result.rows[i][col]} vs ${expected[i][col]}`
              );
              correct = false;
              break;
            }
          }
        }
      }
    }
    res.status(200).json({ correct });
    if (problem.competition.endDate > new Date()) {
      await prisma.problemSubmission.create({
        data: {
          problemId: req.query.id,
          userId: user.id,
          query: queryBody,
          correct,
        },
      });
    }
  } catch (e) {
    console.error("[verify] Error: ", e);
    res.status(400).json({ error: String(e) });
  }
  await client.end();
}
