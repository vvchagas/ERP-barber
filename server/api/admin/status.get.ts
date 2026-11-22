import { isAdminSessionValid } from "../../utils/adminSession";

export default defineEventHandler((event) => ({
  unlocked: isAdminSessionValid(event),
}));
