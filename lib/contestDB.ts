import pg from "pg";

export const solutionsPool = new pg.Pool({
  host: process.env.CONTESTANT_HOST,
  user: process.env.SOLUTIONS_USER,
  password: process.env.SOLUTIONS_PWD,
  database: "solutions",
});
