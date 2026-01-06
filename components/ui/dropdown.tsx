'use client';

import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
  type ButtonHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils/cn';

interface DropdownContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  position: { top: number; left: number; right: number } | null;
}

const DropdownContext = createContext<DropdownContextValue | null>(null);

function useDropdown() {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error('Dropdown components must be used within a Dropdown');
  }
  return context;
}

interface DropdownProps {
  children: ReactNode;
}

export function Dropdown({ children }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        right: window.innerWidth - rect.right - window.scrollX,
      });
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    if (isOpen) {
      updatePosition();
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen, triggerRef, position }}>
      <div ref={containerRef} className="relative inline-block">
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

interface DropdownTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function DropdownTrigger({
  children,
  className,
  ...props
}: DropdownTriggerProps) {
  const { isOpen, setIsOpen, triggerRef } = useDropdown();

  return (
    <button
      ref={triggerRef}
      type="button"
      aria-expanded={isOpen}
      aria-haspopup="menu"
      onClick={() => setIsOpen(!isOpen)}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
}

interface DropdownContentProps {
  children: ReactNode;
  align?: 'start' | 'end';
  className?: string;
}

export function DropdownContent({
  children,
  align = 'end',
  className,
}: DropdownContentProps) {
  const { isOpen, position } = useDropdown();
  const contentRef = useRef<HTMLDivElement>(null);
  const [adjustedStyle, setAdjustedStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (isOpen && position && contentRef.current) {
      const contentRect = contentRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const padding = 8;

      let style: React.CSSProperties = {
        position: 'fixed',
        top: position.top - window.scrollY + 4,
        zIndex: 9999,
      };

      // Check if dropdown would overflow on the right
      if (align === 'end') {
        const rightPosition = position.right;
        if (rightPosition + contentRect.width > viewportWidth - padding) {
          // Not enough space on the right, align to left edge with padding
          style.left = padding;
          style.right = 'auto';
        } else {
          style.right = Math.max(padding, rightPosition);
          style.left = 'auto';
        }
      } else {
        const leftPosition = position.left;
        if (leftPosition + contentRect.width > viewportWidth - padding) {
          // Not enough space, align to right with padding
          style.right = padding;
          style.left = 'auto';
        } else {
          style.left = Math.max(padding, leftPosition);
          style.right = 'auto';
        }
      }

      setAdjustedStyle(style);
    }
  }, [isOpen, position, align]);

  if (!isOpen) return null;

  return (
    <div
      ref={contentRef}
      role="menu"
      style={adjustedStyle}
      className={cn(
        'min-w-[160px] py-1',
        'bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)]',
        'shadow-[var(--shadow-lg)]',
        'animate-in fade-in-0 zoom-in-95',
        className
      )}
    >
      {children}
    </div>
  );
}

interface DropdownItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function DropdownItem({
  children,
  className,
  onClick,
  ...props
}: DropdownItemProps) {
  const { setIsOpen } = useDropdown();

  return (
    <button
      role="menuitem"
      type="button"
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 text-sm text-start',
        'hover:bg-[var(--color-border-subtle)] transition-colors',
        'disabled:opacity-50 disabled:pointer-events-none',
        className
      )}
      onClick={(e) => {
        onClick?.(e);
        setIsOpen(false);
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownSeparator() {
  return <div className="my-1 h-px bg-[var(--color-border)]" />;
}
