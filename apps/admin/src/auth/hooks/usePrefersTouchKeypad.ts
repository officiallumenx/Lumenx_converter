/** True on phones/tablets where an on-screen numeric keypad is appropriate. */
import { useEffect, useState } from "react";

export function usePrefersTouchKeypad() {
  const [prefers, setPrefers] = useState(false);

  useEffect(() => {
    const touchMq = window.matchMedia("(pointer: coarse)");
    const narrowMq = window.matchMedia("(max-width: 767px)");

    const update = () => setPrefers(touchMq.matches || narrowMq.matches);

    update();
    touchMq.addEventListener("change", update);
    narrowMq.addEventListener("change", update);
    return () => {
      touchMq.removeEventListener("change", update);
      narrowMq.removeEventListener("change", update);
    };
  }, []);

  return prefers;
}
