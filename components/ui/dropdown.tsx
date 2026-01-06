'use client';

import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  type ReactNode,
  type ButtonHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils/cn';

interface DropdownContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen, triggerRef }}>
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
  const { isOpen } = useDropdown();

  if (!isOpen) return null;

  return (
    <div
      role="menu"
      className={cn(
        'absolute z-50 mt-1 min-w-[160px] py-1',
        'bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)]',
        'shadow-[var(--shadow-lg)]',
        'animate-in fade-in-0 zoom-in-95',
        align === 'start' ? 'start-0' : 'end-0',
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
