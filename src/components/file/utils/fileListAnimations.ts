import type { MotionStyle } from "framer-motion";
import { cache } from "@/utils";

const EASE_OUT: [number, number, number, number] = [0.4, 0, 0.2, 1];

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: Math.min(index * 0.01, 0.1),
      duration: 0.12,
      ease: EASE_OUT,
    },
  }),
};

export const listAnimationVariants = {
  hidden: {},
  visible: {},
};

export const optimizedAnimationStyle: MotionStyle = {
  willChange: "opacity, transform",
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
  perspective: 1000,
  WebkitPerspective: 1000,
};

const animationVariantsCache = new cache.SmartCache<string, typeof itemVariants>({
  maxSize: 50,
  cleanupThreshold: 0.8,
  cleanupRatio: 0.3,
});

export const getDynamicItemVariants = (
  speed: number,
  isScrolling: boolean,
): typeof itemVariants => {
  const cacheKey = `${speed.toFixed(2)}-${isScrolling ? "1" : "0"}`;
  const cached = animationVariantsCache.get(cacheKey);

  if (cached !== null) {
    return cached;
  }

  const isFastScrolling = speed > 0.3;
  let variants: typeof itemVariants;

  if (isScrolling && isFastScrolling) {
    variants = {
      hidden: { opacity: 1, y: 0 },
      visible: () => ({
        opacity: 1,
        y: 0,
        transition: {
          delay: 0,
          duration: 0,
          ease: EASE_OUT,
        },
      }),
    };
  } else if (isScrolling) {
    variants = {
      hidden: { opacity: 1, y: 0 },
      visible: () => ({
        opacity: 1,
        y: 0,
        transition: {
          delay: 0,
          duration: 0,
          ease: EASE_OUT,
        },
      }),
    };
  } else {
    variants = itemVariants;
  }

  animationVariantsCache.set(cacheKey, variants);
  return variants;
};
