import { isAdminSessionValid } from "../../utils/adminSession";

export default defineEventHandler(async (event) => ({
  unlocked: await isAdminSessionValid(event),
}));
