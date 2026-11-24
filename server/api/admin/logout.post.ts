import { clearAdminSession, requireAdminSession } from "../../utils/adminSession";
import { writeAccessLog } from "../../utils/accessLog";

export default defineEventHandler(async (event) => {
  requireAdminSession(event);
  await writeAccessLog(event, true, "logout", undefined);
  clearAdminSession(event);
  return { unlocked: false };
});
