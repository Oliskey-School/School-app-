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

const baseTransition: Transition = {
  duration: 0.2,
  ease: [0.25, 0.46, 0.45, 0.94],
};

const springTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
};

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
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { ...baseTransition, duration: 0.3 } },
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
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const modalContent: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 25 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: 0.15 },
  },
};

export const drawerVariants: Variants = {
  closed: { x: '-100%' },
  open: { x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
};

export const bottomSheetVariants: Variants = {
  closed: { y: '100%' },
  open: { y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
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
  hidden: { opacity: 0, y: 8, x: -10 },
  visible: {
    opacity: 1,
    y: 0,
    x: 0,
    transition: { type: 'spring', stiffness: 300, damping: 25 },
  },
  exit: {
    opacity: 0,
    y: -8,
    x: 10,
    transition: { duration: 0.15 },
  },
};

export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.15 } },
};

export const cardHover = {
  whileHover: { y: -4, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' },
  transition: { type: 'spring', stiffness: 300, damping: 25 },
};

export const buttonTap = {
  whileTap: { scale: 0.97 },
  transition: tapTransition,
};

export const inputFocus = {
  whileFocus: { scale: 1.01 },
  transition: { duration: 0.1 },
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

export const createStaggerVariants = (stagger = 0.05, delay = 0.1): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: stagger, delayChildren: delay },
  },
});

export const createItemVariants = (y = 10, x = 0, duration = 0.3): Variants => ({
  hidden: { opacity: 0, y, x },
  visible: { opacity: 1, y: 0, x: 0, transition: { duration, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, y: -y, x: -x, transition: { duration: 0.15 } },
});