type LoaderSize = 'xs' | 'sm' | 'md' | 'lg';
type LoaderVariant = 'page' | 'inline' | 'overlay';

type LoaderProps = {
  /** Size of the spinner: xs (16px), sm (20px), md (24px), lg (48px) */
  size?: LoaderSize;
  /** Layout: page = full-screen centered, inline = flex centered (e.g. in card), overlay = absolute overlay */
  variant?: LoaderVariant;
  /** Optional message below the spinner */
  message?: string;
  /** Extra class for the spinner (e.g. text-white, text-[#21295A]) */
  spinnerClassName?: string;
  /** Extra class for the wrapper */
  className?: string;
};

const sizeClasses: Record<LoaderSize, string> = {
  xs: 'h-4 w-4',
  sm: 'h-5 w-5',
  md: 'h-6 w-6',
  lg: 'h-12 w-12',
};

const SpinnerIcon = ({ className = 'text-blue-600' }: { className?: string }) => (
  <svg
    aria-hidden
    className={`animate-spin ${className}`}
    fill="none"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      fill="currentColor"
    />
  </svg>
);

export function Loader({
  size = 'lg',
  variant = 'inline',
  message,
  spinnerClassName = 'text-blue-600',
  className = '',
}: LoaderProps) {
  const spinner = <SpinnerIcon className={`${sizeClasses[size]} ${spinnerClassName}`} />;

  const content = (
    <div className={`flex flex-col items-center justify-center ${message ? 'gap-3' : ''} ${className}`}>
      {spinner}
      {message && <p className="text-sm font-medium text-gray-600 sm:text-base">{message}</p>}
    </div>
  );

  if (variant === 'page') {
    return <div className="flex min-h-screen items-center justify-center">{content}</div>;
  }

  if (variant === 'overlay') {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center rounded-[10px] bg-white/90 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
}

/** Spinner only (no wrapper). Use for buttons or inside MUI/other components. */
export function LoaderSpinner({ size = 'sm', className = 'text-blue-600' }: { size?: LoaderSize; className?: string }) {
  return <SpinnerIcon className={`${sizeClasses[size]} ${className}`} />;
}

export default Loader;
