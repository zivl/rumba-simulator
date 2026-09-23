import type { ButtonHTMLAttributes } from 'react';
import { audio } from '../../game/session';

type Variant = 'default' | 'primary' | 'good' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  small?: boolean;
  silent?: boolean;
}

/** Game button with click sound. */
export const Button = ({ variant = 'default', small, silent, className = '', onClick, ...rest }: ButtonProps) => (
  <button
    {...rest}
    className={`btn ${variant !== 'default' ? `btn-${variant}` : ''} ${small ? 'btn-small' : ''} ${className}`}
    onClick={(event) => {
      if (!silent) audio.play('uiClick');
      onClick?.(event);
    }}
  />
);
