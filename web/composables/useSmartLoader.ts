interface NetworkInformation extends EventTarget {
  effectiveType?: string;
  downlink?: number;
  saveData?: boolean;
}

export function useSmartLoader() {
  const visible = useState<boolean>("smart-loader-visible", () => false);
  const slowConnection = useState<boolean>("smart-loader-slow-connection", () => false);
  const visibleTasks = useState<string[]>("smart-loader-visible-tasks", () => []);
  const pendingTasks = useState<string[]>("smart-loader-pending-tasks", () => []);
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  function setSlowConnection(value: boolean): void {
    slowConnection.value = value;
  }

  function begin(id: string, delayMs: number): void {
    finish(id);
    pendingTasks.value = [...pendingTasks.value, id];
    const timer = setTimeout(() => {
      if (!pendingTasks.value.includes(id)) return;
      if (!visibleTasks.value.includes(id)) {
        visibleTasks.value = [...visibleTasks.value, id];
      }
      visible.value = visibleTasks.value.length > 0;
    }, delayMs);
    timers.set(id, timer);
  }

  function finish(id: string): void {
    const timer = timers.get(id);
    if (timer) clearTimeout(timer);
    timers.delete(id);
    pendingTasks.value = pendingTasks.value.filter((item) => item !== id);
    visibleTasks.value = visibleTasks.value.filter((item) => item !== id);
    visible.value = visibleTasks.value.length > 0;
  }

  function beginLoginSubmit(): () => void {
    const id = `login-submit-${Date.now()}-${Math.random()}`;
    begin(id, 500);
    return () => finish(id);
  }

  return {
    visible,
    slowConnection,
    setSlowConnection,
    begin,
    finish,
    beginLoginSubmit,
  };
}

export function isSlowConnection(): boolean {
  if (typeof navigator === "undefined") return false;
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  const slowTypes = ["slow-2g", "2g", "3g"];
  return Boolean(
    connection?.saveData
    || (connection?.effectiveType && slowTypes.includes(connection.effectiveType))
    || (typeof connection?.downlink === "number" && connection.downlink < 1.5),
  );
}
