import { ImageResponse } from 'next/og';

import { LogoMark } from '@/components/brand/logo-mark';
import { en } from '@/messages/en';

/**
 * The card shown when a link is shared: the mark, the name and what the app
 * does, on a dark blue.
 */
export const previewImage = () =>
  new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 64,
        padding: '0 96px',
        color: '#f0f9ff',
        background: 'linear-gradient(135deg, #082f49 0%, #0a0a0a 100%)'
      }}
    >
      <LogoMark size={256} />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          width: 704
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -2 }}>
          {en.common.appName}
        </div>
        <div style={{ fontSize: 36, lineHeight: 1.3, opacity: 0.85 }}>
          {en.common.appDescription}
        </div>
      </div>
    </div>,
    // The same size as the `size` the route files export.
    { width: 1200, height: 630 }
  );
