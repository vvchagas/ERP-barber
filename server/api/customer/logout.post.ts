import { clearCustomerSession } from "../../utils/adminSession";

export default defineEventHandler((event) => {
  clearCustomerSession(event);
  return { authenticated: false };
});
