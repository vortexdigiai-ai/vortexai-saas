import { ButtonHTMLAttributes } from 'react';

export default function Button({
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-xl px-4 py-2 font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    />
  );
}
