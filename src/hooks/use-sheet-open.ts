import { useEffect, useState } from "react";

// HeroUI:s BottomSheet glider bara upp när isOpen *går* från false till true
// (bottom-sheet-content-container jämför med värdet från förra renderingen).
// Ett ark som monteras redan öppet — t.ex. ett som renderas villkorligt med
// isOpen={true} direkt — får aldrig den övergången och blir liggande under
// skärmkanten: osynligt i en dev build, bara draghandtaget i Expo Go.
//
// Hooken håller isOpen falskt tills arket hunnit monteras stängt, så
// övergången alltid sker. För ett ark som är monterat hela tiden ändrar den
// ingenting. En frame i stället för direkt i effekten: arket ska ha renderat
// sitt stängda läge innan det öppnas.
export const useSheetOpen = (isOpen: boolean) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return isMounted && isOpen;
};
