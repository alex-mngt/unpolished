import { cn } from "cn";
import { FC } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const Button: FC<ButtonProps> = ({ children, className, ...props }) => {
  return (
    <button
      className={cn(
        "border border-foreground font-black text-xl uppercase py-2 px-3 rounded-xs text-foreground/80 hover:text-foreground transition-colors",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};
