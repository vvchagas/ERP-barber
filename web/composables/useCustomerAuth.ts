export interface CustomerSubscriptionSummary {
  id: string;
  remainingCredits: number;
  startsAt: string;
  expiresAt: string;
  active: boolean;
  plan: {
    id: string;
    name: string;
    description: string;
    price: number;
    cutCredits: number;
    beardCredits: number;
  };
}

export interface CustomerProfile {
  id: string;
  role: string;
  name: string;
  phone: string;
  email: string | null;
  avatarUrl: string | null;
  silentCut: boolean;
  silentPreference: boolean;
  favoriteBarberId: string | null;
  seniorMode: boolean;
  fontScale: string;
  theme: string;
  lgpdConsent: boolean;
  lgpdConsentAt: string;
  subscriptions: CustomerSubscriptionSummary[];
}

export function useCustomerAuth() {
  const customer = useState<CustomerProfile | null>("customer-profile", () => null);
  const loading = useState("customer-loading", () => false);

  async function refresh(): Promise<CustomerProfile | null> {
    loading.value = true;
    try {
      customer.value = await $fetch<CustomerProfile>("/api/customer/me");
      return customer.value;
    } catch {
      customer.value = null;
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function logout(): Promise<void> {
    await $fetch("/api/customer/logout", { method: "POST" });
    customer.value = null;
  }

  return { customer, loading, refresh, refreshSession: refresh, logout };
}
