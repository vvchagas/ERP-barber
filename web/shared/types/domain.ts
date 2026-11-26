export type AppointmentStatus =
  | "AGENDADO"
  | "EM_ATENDIMENTO"
  | "CONCLUIDO"
  | "FALTOU"
  | "CANCELADO";

export type PaymentMethod = "PIX" | "CREDITO" | "DEBITO" | "DINHEIRO";
export type PaymentTiming = "PRESENCIAL_BALCAO" | "LIQUIDADO_AGORA";
export type PaymentStatus = "PENDENTE" | "CONFIRMADO" | "ESTORNADO" | "CANCELADO";

export interface MoneyPaymentInput {
  appointmentId?: string;
  method: PaymentMethod;
  timing: PaymentTiming;
  grossAmount: number;
  installments?: number;
  amountReceived?: number;
  pixKey?: string;
  cardAuthorization?: string;
}
