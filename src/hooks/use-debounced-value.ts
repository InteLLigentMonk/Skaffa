import { useEffect, useState } from "react";

// Släpper igenom värdet först när det stått still i delayMs. Används för
// sökfält, så varje tangenttryck inte blir en egen fråga mot databasen.
export const useDebouncedValue = <T>(value: T, delayMs = 250) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
};
