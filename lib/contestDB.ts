import prisma from "./prisma";

const _cache = new Map();

export function getSolutionColumns(name: string): Promise<string[]> {
  let result = _cache.get(name);
  if (result != null) {
    return result;
  }
  result = prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = ${name} AND column_name != 'sort_id'
    `
    .then((res) => res.map((row) => row.column_name))
    .catch(() => {
      _cache.delete(name);
    });
  _cache.set(name, result);
  return result;
}
