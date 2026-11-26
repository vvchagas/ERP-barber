import { clearAdminSession, requireAdminSession } from "../../utils/adminSession";
import { writeAccessLog } from "../../utils/accessLog";

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  await writeAccessLog(event, true, "logout", undefined);
  clearAdminSession(event);
  return { unlocked: false };
});
