import React from 'react';
import PremiumLoader from './PremiumLoader';

interface CenteredLoaderProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  message?: string;
}

/**
 * Compatibility wrapper for older screens. All spinner-style loading states
 * now share the Oliskey education loader rather than drifting visually.
 */
const CenteredLoader: React.FC<CenteredLoaderProps> = ({
  className = '',
  size = 'md',
  fullScreen = false,
  message = 'Loading your school workspace...',
}) => (
  <PremiumLoader
    message={message}
    fullScreen={fullScreen}
    size={size}
    className={className}
  />
);

export default CenteredLoader;
