import helmet from "helmet";
import { fromNodeMiddleware, type NodeMiddleware } from "h3";

export default fromNodeMiddleware(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    frameguard: { action: "sameorigin" },
    referrerPolicy: { policy: "no-referrer" },
  }) as NodeMiddleware,
);
