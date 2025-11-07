import { useEffect } from 'react';

interface UseKeyboardNavigationParams {
  loading: boolean;
  hasError: boolean;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious?: (() => void) | undefined;
  onNext?: (() => void) | undefined;
}

export const useKeyboardNavigation = ({
  loading,
  hasError,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
}: UseKeyboardNavigationParams): void => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (loading || hasError) {
        return;
      }

      if (e.key === 'ArrowLeft' && hasPrevious && onPrevious !== undefined) {
        e.preventDefault();
        onPrevious();
      } else if (e.key === 'ArrowRight' && hasNext && onNext !== undefined) {
        e.preventDefault();
        onNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [loading, hasError, hasPrevious, hasNext, onPrevious, onNext]);
};

