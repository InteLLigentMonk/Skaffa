import { useEffect, useState } from "react";
import { AppState } from "react-native";

const RESEND_COOLDOWN_MS = 60_000;

export const useResendCooldown = (
  durationMs: number = RESEND_COOLDOWN_MS,
  // Reaching the screen straight after a code was sent should start the
  // cooldown; arriving without one should not make the user wait to ask.
  startCoolingDown: boolean = true,
) => {
  const [endsAt, setEndsAt] = useState(() =>
    startCoolingDown ? Date.now() + durationMs : 0,
  );
  const [remainingMs, setRemainingMs] = useState(
    startCoolingDown ? durationMs : 0,
  );

  useEffect(() => {
    const tick = () => setRemainingMs(Math.max(0, endsAt - Date.now()));

    tick();
    const intervalId = setInterval(tick, 500);
    // Timers stryps i bakgrunden — räkna om direkt när appen väcks.
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") tick();
    });

    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, [endsAt]);

  return {
    seconds: Math.ceil(remainingMs / 1000),
    isCoolingDown: remainingMs > 0,
    restart: () => setEndsAt(Date.now() + durationMs),
  };
};
