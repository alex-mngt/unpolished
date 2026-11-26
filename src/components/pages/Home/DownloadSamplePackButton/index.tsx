import { cn } from "cn";
import { ComponentProps, FC } from "react";
import { Button as ShadcnButton } from "@/components/shadcn/button";
import { ButtonStars } from "@/components/Misc/ButtonStars";

type ButtonProps = Omit<
  ComponentProps<typeof ShadcnButton>,
  "variant" | "size"
>;

export const DownloadSamplePackButton: FC<ButtonProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <ShadcnButton
      variant={null}
      size={null}
      className={cn(
        "relative h-14 lg:h-16 aspect-912/270 font-black text-lg lg:text-xl uppercase transition-colors",
        className,
      )}
      {...props}
    >
      <ButtonStars className="absolute inset-0 size-full" />
      {children}
    </ShadcnButton>
  );
};
