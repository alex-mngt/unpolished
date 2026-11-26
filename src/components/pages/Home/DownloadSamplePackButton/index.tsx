import { cn } from "cn";
import { ComponentProps, FC } from "react";
import { Button as ShadcnButton } from "@/components/shadcn/button";

type ButtonProps = Omit<
  ComponentProps<typeof ShadcnButton>,
  "variant" | "size"
>;

export const DownloadSamplePackButton: FC<ButtonProps> = ({
  className,
  ...props
}) => {
  return (
    <ShadcnButton
      variant={null}
      size={null}
      className={cn(
        "font-black text-xl uppercase py-2 px-3 transition-colors",
        className,
      )}
      {...props}
    />
  );
};
