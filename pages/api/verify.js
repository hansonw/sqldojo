import pg from "pg";
import format from "pg-format";
import getRawBody from "raw-body";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const body = await getRawBody(req);
  if (req.method === "POST" && req.query.database && body) {
    const client = new pg.Client({
      host: process.env.CONTESTANT_HOST,
      user: process.env.CONTESTANT_USER,
      password: process.env.CONTESTANT_PWD,
      database: req.query.database,
    });
    const solutionsClient = new pg.Client({
      host: process.env.CONTESTANT_HOST,
      user: process.env.SOLUTIONS_USER,
      password: process.env.SOLUTIONS_PWD,
      database: "solutions",
    });
    try {
      await Promise.all([client.connect(), solutionsClient.connect()]);
      const [result, expected] = await Promise.all([
        client.query(body.toString("utf8")),
        solutionsClient.query(
          format("SELECT * FROM %I ORDER BY sort_id ASC", req.query.database)
        ),
      ]);
      let correct = true;
      if (result.rows.length !== expected.rows.length) {
        console.log(
          `Row count mismatch: ${result.rows.length} vs ${expected.rows.length}`
        );
        correct = false;
      } else {
        let checkCols = [];
        for (let col of expected.fields) {
          if (col.name !== "sort_id") {
            checkCols.push(col.name);
          }
        }
        for (let i = 0; i < result.rows.length && correct; i++) {
          for (let col of checkCols) {
            if (String(result.rows[i][col]) !== String(expected.rows[i][col])) {
              console.log(
                `mismatch at row ${i} col ${col}: ${result.rows[i][col]} vs ${expected.rows[i][col]}`
              );
              correct = false;
              break;
            }
          }
        }
      }
      res.status(200).json({ correct });
    } catch (e) {
      res.status(200).json({ error: String(e) });
    }
    await Promise.all([client.end(), solutionsClient.end()]);
  } else {
    res.status(400).json({});
  }
}