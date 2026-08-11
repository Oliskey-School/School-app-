import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { 
  buttonTap, 
  cardHover, 
  inputFocus, 
  scaleIn, 
  fadeIn, 
  slideUp, 
  modalOverlay, 
  modalContent,
  drawerVariants,
  bottomSheetVariants,
  pageTransition,
  createStaggerVariants,
  createItemVariants,
} from '../../lib/motion';
import { useReducedMotion } from '../../lib/motion';

export interface MotionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'link' | 'destructive' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const MotionButton = forwardRef<HTMLButtonElement, MotionButtonProps>(
  ({ children, onClick, disabled = false, variant = 'default', size = 'default', isLoading = false, className = '', ...props }, ref) => {
    const reducedMotion = useReducedMotion();

    const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

    const variantClasses = {
      default: 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 focus-visible:ring-indigo-500',
      outline: 'border border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100 focus-visible:ring-gray-500',
      link: 'underline-offset-4 hover:underline text-indigo-600 focus-visible:ring-indigo-500',
      destructive: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500',
      ghost: 'hover:bg-gray-100 active:bg-gray-200 focus-visible:ring-gray-500',
    };

    const sizeClasses = {
      default: 'h-10 px-4 py-2',
      sm: 'h-9 px-3 text-sm',
      lg: 'h-11 px-8',
      icon: 'h-10 w-10',
    };

    const tapAnimation = reducedMotion ? { whileTap: undefined, transition: undefined } : buttonTap;

    return (
      <motion.button
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        onClick={onClick}
        disabled={disabled || isLoading}
        whileTap={tapAnimation.whileTap}
        transition={tapAnimation.transition}
        {...props}
      >
        {isLoading && (
          <motion.svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: 'center' }}
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </motion.svg>
        )}
        {children}
      </motion.button>
    );
  }
);

MotionButton.displayName = 'MotionButton';

export interface MotionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  variant?: 'default' | 'elevated' | 'outlined';
}

export const MotionCard = forwardRef<HTMLDivElement, MotionCardProps>(
  ({ children, className = '', hover = true, variant = 'default', ...props }, ref) => {
    const reducedMotion = useReducedMotion();

    const variantClasses = {
      default: 'bg-white rounded-lg border border-gray-200 shadow-sm',
      elevated: 'bg-white rounded-lg border border-gray-200 shadow-lg',
      outlined: 'bg-white rounded-lg border-2 border-gray-200',
    };

    const hoverAnimation = hover && !reducedMotion ? cardHover : {};

    return (
      <motion.div
        ref={ref}
        className={`${variantClasses[variant]} ${className}`}
        initial={false}
        whileHover={hoverAnimation.whileHover}
        transition={hoverAnimation.transition}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

MotionCard.displayName = 'MotionCard';

export const MotionCardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, className = '', ...props }, ref) => (
    <motion.div
      ref={ref}
      className={`p-6 ${className}`}
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      {...props}
    >
      {children}
    </motion.div>
  )
);

MotionCardHeader.displayName = 'MotionCardHeader';

export const MotionCardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ children, className = '', ...props }, ref) => (
    <h3
      ref={ref}
      className={`text-lg font-semibold leading-none tracking-tight ${className}`}
      {...props}
    >
      {children}
    </h3>
  )
);

MotionCardTitle.displayName = 'MotionCardTitle';

export const MotionCardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, className = '', ...props }, ref) => (
    <motion.div
      ref={ref}
      className={`p-6 pt-0 ${className}`}
      variants={slideUp}
      initial="hidden"
      animate="visible"
      {...props}
    >
      {children}
    </motion.div>
  )
);

MotionCardContent.displayName = 'MotionCardContent';

export interface MotionInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const MotionInput = forwardRef<HTMLInputElement, MotionInputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const reducedMotion = useReducedMotion();
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    const focusAnimation = reducedMotion ? { whileFocus: undefined, transition: undefined } : inputFocus;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {label}
          </label>
        )}
        <motion.input
          ref={ref}
          id={inputId}
          className={`flex h-10 w-full rounded-md border ${
            error ? 'border-red-300' : 'border-gray-300'
          } bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            error ? 'focus:ring-red-500 focus:border-red-500' : 'focus:ring-indigo-600 focus:border-indigo-600'
          } disabled:cursor-not-allowed disabled:opacity-50 transition-colors ${className}`}
          whileFocus={focusAnimation.whileFocus}
          transition={focusAnimation.transition}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        {error && (
          <motion.p
            id={`${inputId}-error`}
            className="mt-1.5 text-sm text-red-600"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reducedMotion ? { duration: 0.01 } : { duration: 0.15 }}
          >
            {error}
          </motion.p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

MotionInput.displayName = 'MotionInput';

export interface MotionSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: { value: string; label: string }[];
}

export const MotionSelect = forwardRef<HTMLSelectElement, MotionSelectProps>(
  ({ label, error, helperText, options, className = '', id, ...props }, ref) => {
    const reducedMotion = useReducedMotion();
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

    const focusAnimation = reducedMotion ? { whileFocus: undefined, transition: undefined } : inputFocus;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {label}
          </label>
        )}
        <motion.select
          ref={ref}
          id={selectId}
          className={`flex h-10 w-full rounded-md border ${
            error ? 'border-red-300' : 'border-gray-300'
          } bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            error ? 'focus:ring-red-500 focus:border-red-500' : 'focus:ring-indigo-600 focus:border-indigo-600'
          } disabled:cursor-not-allowed disabled:opacity-50 transition-colors ${className}`}
          whileFocus={focusAnimation.whileFocus}
          transition={focusAnimation.transition}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </motion.select>
        {error && (
          <motion.p
            id={`${selectId}-error`}
            className="mt-1.5 text-sm text-red-600"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reducedMotion ? { duration: 0.01 } : { duration: 0.15 }}
          >
            {error}
          </motion.p>
        )}
        {helperText && !error && (
          <p id={`${selectId}-helper`} className="mt-1.5 text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

MotionSelect.displayName = 'MotionSelect';

export const MotionBadge = ({
  children,
  variant = 'default',
  className = '',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'outline' | 'success' | 'warning' | 'destructive';
}) => {
  const reducedMotion = useReducedMotion();

  const variantClasses = {
    default: 'bg-indigo-100 text-indigo-800',
    outline: 'border border-gray-300 bg-white text-gray-700',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-amber-100 text-amber-800',
    destructive: 'bg-red-100 text-red-800',
  };

  return (
    <motion.span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variantClasses[variant]} ${className}`}
      initial={false}
      whileHover={reducedMotion ? {} : { scale: 1.05 }}
      transition={reducedMotion ? { duration: 0.01 } : { type: 'spring', stiffness: 400, damping: 17 }}
      {...props}
    >
      {children}
    </motion.span>
  );
};

export interface MotionTabsProps {
  children: React.ReactNode;
  defaultValue?: string;
  className?: string;
  onChange?: (value: string) => void;
}

export const MotionTabs = ({ children, defaultValue, className = '', onChange }: MotionTabsProps) => {
  const [activeTab, setActiveTab] = React.useState(defaultValue || '');
  const reducedMotion = useReducedMotion();

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    onChange?.(value);
  };

  return (
    <div className={className} data-active-tab={activeTab}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (typeof child.type === 'string') return child;
          return React.cloneElement(child as React.ReactElement<any>, {
            activeTab,
            setActiveTab: handleTabChange,
            reducedMotion,
          });
        }
        return child;
      })}
    </div>
  );
};

export interface MotionTabsListProps {
  children: React.ReactNode;
  className?: string;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  reducedMotion?: boolean;
}

export const MotionTabsList = ({
  children,
  className = '',
  activeTab,
  setActiveTab,
  reducedMotion = false,
}: MotionTabsListProps) => (
  <motion.div
    className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 ${className}`}
    layout
    {...(reducedMotion ? {} : { transition: { type: 'spring', stiffness: 500, damping: 30 } })}
  >
    {React.Children.map(children, (child) => {
      if (React.isValidElement(child)) {
        return React.cloneElement(child as React.ReactElement<any>, {
          activeTab,
          setActiveTab,
          reducedMotion,
        });
      }
      return child;
    })}
  </motion.div>
);

export interface MotionTabsTriggerProps {
  children: React.ReactNode;
  value: string;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  className?: string;
  reducedMotion?: boolean;
}

export const MotionTabsTrigger = ({
  children,
  value,
  activeTab,
  setActiveTab,
  className = '',
  reducedMotion = false,
}: MotionTabsTriggerProps) => {
  const isActive = activeTab === value;

  return (
    <motion.button
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
        isActive ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
      } ${className}`}
      data-state={isActive ? 'active' : 'inactive'}
      onClick={() => setActiveTab?.(value)}
      whileTap={reducedMotion ? {} : { scale: 0.97 }}
      transition={reducedMotion ? { duration: 0.01 } : { type: 'spring', stiffness: 400, damping: 17 }}
      layout
    >
      {children}
    </motion.button>
  );
};

export const MotionTabsContent = ({
  children,
  value,
  activeTab,
  className = '',
  reducedMotion = false,
}: {
  children: React.ReactNode;
  value: string;
  activeTab?: string;
  className?: string;
  reducedMotion?: boolean;
}) => {
  if (activeTab !== value) return null;

  return (
    <motion.div
      className={`mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${className}`}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={reducedMotion ? { duration: 0.01 } : { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
};

export const MotionList = ({
  children,
  className = '',
  stagger = 0.05,
  delay = 0.1,
  reducedMotion = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  stagger?: number;
  delay?: number;
  reducedMotion?: boolean;
}) => (
  <motion.div
    className={className}
    variants={reducedMotion ? {} : createStaggerVariants(stagger, delay)}
    initial="hidden"
    animate="visible"
    {...props}
  >
    {children}
  </motion.div>
);

export const MotionListItem = ({
  children,
  className = '',
  y = 10,
  x = 0,
  duration = 0.3,
  reducedMotion = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  y?: number;
  x?: number;
  duration?: number;
  reducedMotion?: boolean;
}) => (
  <motion.div
    className={className}
    variants={reducedMotion ? {} : createItemVariants(y, x, duration)}
    {...props}
  >
    {children}
  </motion.div>
);

export const MotionModal = ({
  isOpen,
  onClose,
  children,
  title,
  className = '',
  size = 'md',
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}) => {
  const reducedMotion = useReducedMotion();
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw]',
  };

  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={modalOverlay}
      transition={reducedMotion ? { duration: 0.01 } : undefined}
    >
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        variants={modalOverlay}
      />
      <motion.div
        className={`bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]} overflow-hidden ${className}`}
        variants={modalContent}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={reducedMotion ? { duration: 0.01 } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || onClose) && (
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
            {onClose && (
              <motion.button
                onClick={onClose}
                className="p-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                whileHover={reducedMotion ? {} : { scale: 1.1 }}
                whileTap={reducedMotion ? {} : { scale: 0.95 }}
                aria-label="Close modal"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            )}
          </div>
        )}
        <div className="p-4">{children}</div>
      </motion.div>
    </motion.div>
  );
};

export const MotionDrawer = ({
  isOpen,
  onClose,
  children,
  position = 'left',
  className = '',
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  position?: 'left' | 'right';
  className?: string;
}) => {
  const reducedMotion = useReducedMotion();

  const variants = {
    left: drawerVariants,
    right: { ...drawerVariants, closed: { x: '100%' } },
  }[position];

  if (!isOpen) return null;

  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        initial="hidden"
        animate="visible"
        exit="hidden"
        variants={modalOverlay}
        onClick={onClose}
        transition={reducedMotion ? { duration: 0.01 } : undefined}
      />
      <motion.aside
        className={`fixed inset-y-0 z-50 w-72 bg-white shadow-2xl lg:hidden ${position === 'right' ? 'right-0' : 'left-0'} ${className}`}
        initial="closed"
        animate="open"
        exit="closed"
        variants={variants}
        transition={reducedMotion ? { duration: 0.01 } : undefined}
      >
        <div className="p-4 border-b border-gray-100">
          <motion.button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 lg:hidden"
            whileHover={reducedMotion ? {} : { scale: 1.1 }}
            whileTap={reducedMotion ? {} : { scale: 0.95 }}
            aria-label="Close drawer"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </motion.button>
        </div>
        {children}
      </motion.aside>
    </>
  );
};

export const MotionBottomSheet = ({
  isOpen,
  onClose,
  children,
  className = '',
  snapPoints = ['50%', '90%'],
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  snapPoints?: string[];
}) => {
  const reducedMotion = useReducedMotion();

  if (!isOpen) return null;

  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-black/50"
        initial="hidden"
        animate="visible"
        exit="hidden"
        variants={modalOverlay}
        onClick={onClose}
        transition={reducedMotion ? { duration: 0.01 } : undefined}
      />
      <motion.div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl ${className}`}
        initial="closed"
        animate="open"
        exit="closed"
        variants={bottomSheetVariants}
        transition={reducedMotion ? { duration: 0.01 } : undefined}
      >
        <div className="flex items-center justify-center py-3">
          <motion.div
            className="w-10 h-1 bg-gray-300 rounded-full"
            drag="y"
            dragConstraints={{ top: 0, bottom: 20 }}
            dragElastic={0.2}
          />
        </div>
        {children}
      </motion.div>
    </>
  );
};

export const MotionTooltip = ({
  children,
  content,
  position = 'top',
  className = '',
}: {
  children: React.ReactElement;
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}) => {
  const reducedMotion = useReducedMotion();
  const [isVisible, setIsVisible] = React.useState(false);

  const positions = {
    top: { x: 0, y: -8 },
    bottom: { x: 0, y: 8 },
    left: { x: -8, y: 0 },
    right: { x: 8, y: 0 },
  };

  return (
    <div className="relative inline-block" onMouseEnter={() => setIsVisible(true)} onMouseLeave={() => setIsVisible(false)}>
      {React.cloneElement(children as React.ReactElement<{ onMouseEnter?: () => void; onMouseLeave?: () => void }>, {
        onMouseEnter: () => setIsVisible(true),
        onMouseLeave: () => setIsVisible(false),
      })}
      <motion.div
        className={`fixed z-50 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded shadow-lg whitespace-nowrap ${className}`}
        initial={{ opacity: 0, ...positions[position] }}
        animate={{ opacity: isVisible ? 1 : 0, ...(isVisible ? { x: 0, y: 0 } : positions[position]) }}
        exit={{ opacity: 0, ...positions[position] }}
        transition={reducedMotion ? { duration: 0.01 } : { duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {content}
      </motion.div>
    </div>
  );
};

export const MotionSkeleton = ({
  className = '',
  variant = 'text',
  lines = 3,
}: {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  lines?: number;
}) => {
  const reducedMotion = useReducedMotion();

  const baseClass = 'bg-gray-200 rounded animate-pulse';
  const variants = {
    text: 'h-4 w-full',
    circular: 'h-10 w-10 rounded-full',
    rectangular: 'h-20 w-full rounded-lg',
  };

  if (variant === 'text') {
    return (
      <div className={`${className} space-y-3`}>
        {Array.from({ length: lines }).map((_, i) => (
          <motion.div
            key={i}
            className={`${baseClass} ${variants.text} ${i === lines - 1 ? 'w-3/4' : ''}`}
            initial={false}
            animate={reducedMotion ? {} : { opacity: [1, 0.4, 1] }}
            transition={reducedMotion ? { duration: 0.01 } : { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className={`${baseClass} ${variants[variant]} ${className}`}
      initial={false}
      animate={reducedMotion ? {} : { opacity: [1, 0.4, 1] }}
      transition={reducedMotion ? { duration: 0.01 } : { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
};

export const MotionPageTransition = ({
  children,
  className = '',
  reducedMotion = false,
}: {
  children: React.ReactNode;
  className?: string;
  reducedMotion?: boolean;
}) => (
  <motion.div
    className={className}
    variants={pageTransition}
    initial="hidden"
    animate="visible"
    exit="exit"
    transition={reducedMotion ? { duration: 0.01 } : undefined}
  >
    {children}
  </motion.div>
);

export const MotionFadeIn = ({
  children,
  delay = 0,
  duration = 0.2,
  className = '',
  reducedMotion = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  delay?: number;
  duration?: number;
  reducedMotion?: boolean;
}) => (
  <motion.div
    className={className}
    variants={fadeIn}
    initial="hidden"
    animate="visible"
    transition={reducedMotion ? { duration: 0.01 } : { delay, duration, ease: [0.25, 0.46, 0.45, 0.94] }}
    {...props}
  >
    {children}
  </motion.div>
);

export const MotionSlideUp = ({
  children,
  delay = 0,
  duration = 0.3,
  className = '',
  reducedMotion = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  delay?: number;
  duration?: number;
  reducedMotion?: boolean;
}) => (
  <motion.div
    className={className}
    variants={slideUp}
    initial="hidden"
    animate="visible"
    transition={reducedMotion ? { duration: 0.01 } : { delay, duration, ease: [0.25, 0.46, 0.45, 0.94] }}
    {...props}
  >
    {children}
  </motion.div>
);

export const MotionScaleIn = ({
  children,
  delay = 0,
  duration = 0.15,
  className = '',
  reducedMotion = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  delay?: number;
  duration?: number;
  reducedMotion?: boolean;
}) => (
  <motion.div
    className={className}
    variants={scaleIn}
    initial="hidden"
    animate="visible"
    transition={reducedMotion ? { duration: 0.01 } : { delay, duration, ease: [0.25, 0.46, 0.45, 0.94] }}
    {...props}
  >
    {children}
  </motion.div>
);