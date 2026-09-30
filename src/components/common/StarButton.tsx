import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarButtonProps {
  isStarred: boolean;
  onToggle: (e: React.MouseEvent) => void;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  title?: string;
  showText?: boolean;
}

export const StarButton: React.FC<StarButtonProps> = ({
  isStarred,
  onToggle,
  size = 'md',
  className = '',
  title,
  showText = false
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 500);
    onToggle(e);
  };

  const sizeClasses = {
    xs: 'h-3.5 w-3.5',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const paddingClasses = {
    xs: 'p-1',
    sm: 'p-1.5',
    md: 'p-1.5',
    lg: 'p-2'
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isStarred ? 'Remove from favorites' : 'Add to favorites'}
      title={title || (isStarred ? 'Starred favorite (click to remove)' : 'Star this site (add to favorites)')}
      className={`group relative inline-flex items-center gap-1.5 rounded-lg transition-all duration-200 cursor-pointer select-none ${paddingClasses[size]} ${
        isStarred
          ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-400/10'
          : 'text-neutral-400 hover:text-amber-400 hover:bg-neutral-800/60 dark:hover:bg-neutral-800/80'
      } ${className}`}
    >
      <Star
        className={`${sizeClasses[size]} transition-transform duration-200 ${
          isStarred
            ? 'fill-amber-400 text-amber-400 filter drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]'
            : 'text-neutral-400 group-hover:text-amber-400 group-hover:scale-110'
        } ${isAnimating ? 'scale-125 rotate-12 transition-transform' : ''}`}
      />
      {showText && (
        <span className="text-xs font-semibold">
          {isStarred ? 'Starred' : 'Star'}
        </span>
      )}
    </button>
  );
};
