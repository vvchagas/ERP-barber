import { clearAdminSession } from "../../utils/adminSession";

export default defineEventHandler((event) => {
  clearAdminSession(event);
  return { unlocked: false };
});
