import { useEffect, useState } from 'react';
import { Variants, Transition } from 'framer-motion';

export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export const useReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  return reduced;
};

/* ============================================================================
 * THE TIMING LANGUAGE
 *
 * Two springs, and nothing else. Apple expresses springs as a damping RATIO
 * (how much it overshoots) and a RESPONSE (how quickly it reaches the target) —
 * deliberately not as stiffness/mass/damping. Framer Motion's `bounce` +
 * `duration` spring API maps onto those two directly, so that is what we use.
 *
 *   springStandard  — damping 1.0 (critically damped, no overshoot). The default
 *                     for everything: sheets, modals, lists, cards, values.
 *   springMomentum  — damping ~0.8 (slight overshoot). ONLY after a gesture that
 *                     carried momentum: a flick, a swipe-dismiss, a drag release.
 *
 * Overshoot on a menu that merely faded in feels wrong. Overshoot on a card you
 * threw feels right. That is the entire rule.
 *
 * Springs are also inherently interruptible and animate from the CURRENT on-screen
 * value, which is what lets a user grab a moving element and reverse it without
 * the jump a fixed-duration tween produces.
 * ========================================================================== */

export const springStandard: Transition = {
  type: 'spring',
  bounce: 0,
  duration: 0.35,
};

export const springMomentum: Transition = {
  type: 'spring',
  bounce: 0.2,
  duration: 0.35,
};

/**
 * Exits run at ~65% of the entry. An interface that leaves promptly feels
 * responsive; an exit that takes as long as the entry feels like lag.
 */
export const springExit: Transition = {
  type: 'spring',
  bounce: 0,
  duration: 0.22,
};

/** Content swapping inside the same container — a crossfade, not a movement. */
export const crossfade: Transition = {
  duration: 0.15,
  ease: [0.25, 0.46, 0.45, 0.94],
};

/** Stagger interval for list/grid entrances. */
export const STAGGER_INTERVAL = 0.04;

const baseTransition: Transition = springStandard;

const springTransition: Transition = springStandard;

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: baseTransition },
};

export const fadeOut: Variants = {
  visible: { opacity: 1 },
  hidden: { opacity: 0, transition: baseTransition },
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: baseTransition },
};

export const slideDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: baseTransition },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: baseTransition },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: baseTransition },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { ...baseTransition, duration: 0.15 } },
};

export const scaleOut: Variants = {
  visible: { opacity: 1, scale: 1 },
  hidden: { opacity: 0, scale: 0.95, transition: { ...baseTransition, duration: 0.15 } },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: STAGGER_INTERVAL,
      delayChildren: 0.04,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: springStandard },
  exit: { opacity: 0, y: 8, transition: springExit },
};

export const pressTransition: Transition = {
  duration: 0.05,
};

export const tapTransition: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 17,
};

export const modalOverlay: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: crossfade },
  exit: { opacity: 0, transition: crossfade },
};

/**
 * Enters and exits along the SAME path — same offset, same scale. An element
 * that arrives from below and then dissolves in place reads as two unrelated
 * events; matching them tells the user where the thing went.
 */
export const modalContent: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 16 },
  visible: { opacity: 1, scale: 1, y: 0, transition: springStandard },
  exit: { opacity: 0, scale: 0.96, y: 16, transition: springExit },
};

export const drawerVariants: Variants = {
  closed: { x: '-100%', transition: springExit },
  open: { x: 0, transition: springStandard },
};

export const bottomSheetVariants: Variants = {
  closed: { y: '100%', transition: springExit },
  open: { y: 0, transition: springStandard },
};

export const listVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05,
    },
  },
};

export const listItemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: springStandard },
  exit: { opacity: 0, y: 8, transition: springExit },
};

/**
 * Page-to-page movement is a crossfade, not a slide. A 250ms travel animation on
 * every single navigation is a tax the user pays dozens of times a session, and
 * it delays the content they asked for.
 */
export const pageTransition: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: crossfade },
  exit: { opacity: 0, transition: crossfade },
};

export const cardHover = {
  whileHover: { y: -4, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' },
  transition: springStandard,
};

export const buttonTap = {
  whileTap: { scale: 0.97 },
  transition: tapTransition,
};

/**
 * Focus is communicated by the focus ring, not by resizing the field. Scaling an
 * input on focus nudges everything around it and re-triggers layout while the
 * user is typing.
 */
export const inputFocus = {
  transition: crossfade,
};

export const loadingPulse: Variants = {
  initial: { opacity: 0.6 },
  animate: { opacity: 1, transition: { duration: 1, repeat: Infinity, ease: 'easeInOut' } },
};

export const shimmer: Variants = {
  initial: { backgroundPosition: '200% 0' },
  animate: {
    backgroundPosition: '-200% 0',
    transition: { duration: 1.5, repeat: Infinity, ease: 'linear' },
  },
};

export const spin: Variants = {
  animate: { rotate: 360, transition: { duration: 1, repeat: Infinity, ease: 'linear' } },
};

export const getReducedMotionVariants = <T extends Variants>(
  variants: T,
  reduced: boolean
): T => {
  if (!reduced) return variants;
  
  const reducedVariants = {} as T;
  for (const key of Object.keys(variants) as (keyof T)[]) {
    const variant = variants[key];
    if (variant && typeof variant === 'object' && 'transition' in variant) {
      reducedVariants[key] = {
        ...variant,
        transition: { duration: 0.01 },
      } as any;
    } else {
      reducedVariants[key] = variant;
    }
  }
  return reducedVariants;
};

export const createStaggerVariants = (stagger = STAGGER_INTERVAL, delay = 0.04): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: stagger, delayChildren: delay },
  },
});

/** Item entrance/exit sharing one path. `duration` is accepted for call-site
 *  compatibility but the spring owns the timing. */
export const createItemVariants = (y = 8, x = 0, _duration?: number): Variants => ({
  hidden: { opacity: 0, y, x },
  visible: { opacity: 1, y: 0, x: 0, transition: springStandard },
  exit: { opacity: 0, y, x, transition: springExit },
});