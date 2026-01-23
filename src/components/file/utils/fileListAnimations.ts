import type { MotionStyle } from "framer-motion";

const itemVariants = {
  hidden: { opacity: 1, y: 0 },
  visible: () => ({
    opacity: 1,
    y: 0,
  }),
};

export const optimizedAnimationStyle: MotionStyle = {
  willChange: "opacity, transform",
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
  perspective: 1000,
  WebkitPerspective: 1000,
};

export const getDynamicItemVariants = (
  _speed: number,
  _isScrolling: boolean,
): typeof itemVariants => {
  return itemVariants;
};
