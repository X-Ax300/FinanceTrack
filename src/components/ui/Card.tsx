import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glass?: boolean;
  glow?: 'cyan' | 'blue' | 'green' | 'amber' | 'red';
}

export default function Card({ children, className, glass = true, glow }: CardProps) {
  const { theme } = useTheme();

  const glowClasses = {
    cyan: 'shadow-cyan-500/10 border-cyan-500/20',
    blue: 'shadow-blue-500/10 border-blue-500/20',
    green: 'shadow-green-500/10 border-green-500/20',
    amber: 'shadow-amber-500/10 border-amber-500/20',
    red: 'shadow-red-500/10 border-red-500/20',
  };

  return (
    <div
      className={cn(
        'rounded-2xl border transition-all duration-200',
        glass && theme === 'dark'
          ? 'bg-gray-900/60 backdrop-blur-md'
          : glass && theme === 'light'
            ? 'bg-white'
            : '',
        theme === 'dark'
          ? 'border-gray-800/60 shadow-xl'
          : 'border-gray-200 shadow-sm',
        glow && glowClasses[glow],
        className
      )}
    >
      {children}
    </div>
  );
}
