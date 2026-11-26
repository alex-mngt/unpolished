import { cn } from "cn";
import { ComponentProps, FC } from "react";
import { buttonVariants } from "@/components/shadcn/button";
import { ButtonStars } from "@/components/Misc/ButtonStars";

type DownloadSamplePackButtonProps = ComponentProps<"a">;

/**
 * Looks like a button, but downloading a file is navigation to a resource, so
 * it is a real link: it works without JavaScript and crawlers can follow it.
 * The shadcn `Button` is not used with `render={<a />}` because Base UI then
 * adds `role="button"` to the anchor.
 */
export const DownloadSamplePackButton: FC<DownloadSamplePackButtonProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <a
      download
      className={cn(
        buttonVariants({ variant: null, size: null }),
        "relative h-14 lg:h-16 aspect-912/270 font-black text-lg lg:text-xl uppercase transition-colors",
        className,
      )}
      {...props}
    >
      <ButtonStars className="absolute inset-0 size-full" />
      {children}
    </a>
  );
};
