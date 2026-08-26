import { Link } from "react-router-dom";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-forest text-white hover:bg-forest-dark disabled:bg-forest/50",
  secondary: "bg-rose text-white hover:bg-rose-dark disabled:bg-rose/50",
  ghost: "bg-transparent text-forest border border-border hover:bg-forest-soft",
  danger: "bg-error text-white hover:bg-error/90",
};

interface CommonProps {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  className?: string;
  children: ReactNode;
}

const SIZE_CLASSES = { sm: "h-9 px-4 text-sm", md: "h-11 px-5 text-sm", lg: "h-14 px-6 text-base" };

type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type LinkProps = CommonProps & { href: string; target?: string };

export default function Button(props: ButtonProps | LinkProps) {
  const { variant = "primary", size = "md", className = "", children } = props;
  const classes = [
    "inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] font-medium transition-colors",
    "disabled:cursor-not-allowed",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  ].join(" ");

  if ("href" in props && props.href) {
    return (
      <Link to={props.href} className={classes} target={props.target}>
        {children}
      </Link>
    );
  }

  const { href: _href, variant: _v, size: _s, className: _c, children: _ch, ...rest } = props as ButtonProps;
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
