import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "./prisma";

type NotificationInput = {
  type:
    | "APPOINTMENT_NEW"
    | "APPOINTMENT_CANCELED"
    | "APPOINTMENT_COMPLETED"
    | "PAYMENT_CONFIRMED"
    | "PAYMENT_TEST"
    | "CUSTOMER_NEW"
    | "VIP_SUBSCRIBED"
    | "TEAM_UPDATE";
  title: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
};

type NotificationWriter = Pick<Prisma.TransactionClient, "adminNotification">;

export async function createAdminNotification(
  input: NotificationInput,
  writer: NotificationWriter = prisma,
): Promise<void> {
  await writer.adminNotification.create({
    data: {
      ...input,
      metadata: input.metadata,
    },
  });
}
