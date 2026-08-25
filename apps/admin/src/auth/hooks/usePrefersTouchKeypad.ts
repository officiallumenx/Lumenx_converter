/** True on phones/tablets where an on-screen numeric keypad is appropriate. */
import { useMediaQuery } from "@lumenx/ui";

export function usePrefersTouchKeypad() {
  const coarse = useMediaQuery("(pointer: coarse)");
  const narrow = useMediaQuery("(max-width: 767px)");
  return coarse || narrow;
}
