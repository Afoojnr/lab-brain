'use client';

import type { ReactNode } from 'react';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';

/**
 * Says why a greyed-out button is greyed out, and what to do, when the mouse is
 * over it or it is reached with the keyboard. A disabled button does not
 * receive the mouse itself, so the message hangs on a wrapper; screen readers
 * get the same text. With no reason (the button is enabled) it adds nothing.
 *
 * @param reason - Why the button is disabled; null when it is not.
 * @param children - The (disabled) button.
 */
export const DisabledReason = ({
  reason,
  children
}: {
  reason: string | null;
  children: ReactNode;
}) =>
  reason === null ? (
    children
  ) : (
    <Tooltip>
      <TooltipTrigger
        render={
          <span tabIndex={0} className="inline-flex cursor-not-allowed" />
        }
      >
        {children}
        <span className="sr-only">{reason}</span>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
