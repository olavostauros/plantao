import type { ComponentChildren, JSX } from 'preact';

// Botão do design system. Renderiza HTML estático no build; só leva JS ao navegador
// quando o componente pai é uma ilha (`client:*`).
// Alvo de toque ≥ 44 px e foco sempre visível (SPECIFICATION.md §4, personas).

export type ButtonVariant = 'primary' | 'secondary';

type Props = Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'class' | 'className'> & {
  variant?: ButtonVariant;
  class?: string;
  children: ComponentChildren;
};

const base =
  'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border-2 px-4 ' +
  'font-semibold leading-tight cursor-pointer ' +
  'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-fg ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

const variants: Record<ButtonVariant, string> = {
  primary: 'border-fg bg-fg text-bg',
  secondary: 'border-fg bg-bg text-fg',
};

export function Button({ variant = 'primary', type = 'button', class: extra, children, ...rest }: Props) {
  const cls = [base, variants[variant], extra].filter(Boolean).join(' ');
  return (
    <button type={type} class={cls} {...rest}>
      {children}
    </button>
  );
}
