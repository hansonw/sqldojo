import pg from "pg";
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
    try {
      await client.connect();
      const result = await client.query(body.toString("utf8"));
      res.status(200).json({
        rows: result.rows.slice(0, 100),
        columns: result.fields.map((x) => x.name),
        count: result.rows.length,
      });
    } catch (e) {
      res.status(200).json({ error: String(e) });
    }
    await client.end();
  } else {
    res.status(400).json({});
  }
}
