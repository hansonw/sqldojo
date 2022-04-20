import pg from "pg";

export const solutionsPool = new pg.Pool({
  host: process.env.CONTESTANT_HOST,
  user: process.env.SOLUTIONS_USER,
  password: process.env.SOLUTIONS_PWD,
  database: "solutions",
});

const _cache = new Map();

export function getSolutionColumns(name: string): Promise<string[]> {
  let result = _cache.get(name);
  if (result != null) {
    return result;
  }
  result = solutionsPool
    .query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name != $2",
      [name, "sort_id"]
    )
    .then((res) => res.rows.map((row) => row.column_name))
    .catch(() => {
      _cache.delete(name);
    });
  _cache.set(name, result);
  return result;
}
