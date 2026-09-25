'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';

type FadeInProps = {
  children: ReactNode;
  className?: string;
  delaySeconds?: number;
};

/**
 * Eases page content in on navigation, so a route change reads as arriving
 * somewhere new. Critically damped spring: no overshoot, safe to interrupt.
 */
export const FadeIn = ({
  children,
  className,
  delaySeconds = 0
}: FadeInProps) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{
      type: 'spring',
      bounce: 0,
      duration: 0.45,
      delay: delaySeconds
    }}
  >
    {children}
  </motion.div>
);
