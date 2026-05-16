import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className, ...props }: InputProps) {
  const { theme } = useTheme();

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          {label}
        </label>
      )}
      <input
        {...props}
        className={cn(
          'w-full px-3.5 py-2.5 rounded-xl text-sm border transition-all duration-200 outline-none focus:ring-2 focus:ring-cyan-500/40',
          theme === 'dark'
            ? 'bg-gray-800/60 border-gray-700 text-white placeholder-gray-500 focus:border-cyan-500/60'
            : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-cyan-400',
          error && 'border-red-500/60 focus:ring-red-500/30',
          className
        )}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export function Select({ label, error, className, children, ...props }: SelectProps) {
  const { theme } = useTheme();

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          {label}
        </label>
      )}
      <select
        {...props}
        className={cn(
          'w-full px-3.5 py-2.5 rounded-xl text-sm border transition-all duration-200 outline-none focus:ring-2 focus:ring-cyan-500/40',
          theme === 'dark'
            ? 'bg-gray-800/60 border-gray-700 text-white focus:border-cyan-500/60'
            : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-400',
          error && 'border-red-500/60',
          className
        )}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
