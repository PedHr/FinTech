import { purgeExpiredImports } from "@/server/imports/retention";
import { env } from "@/shared/lib/env";

export async function GET(request: Request) {
  const expected = env().CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json(await purgeExpiredImports());
}
