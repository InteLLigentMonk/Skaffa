import { Button } from "heroui-native";
import { twMerge } from "tailwind-merge";

const COLORS = {
  orange: "bg-secondary-soft border-secondary",
  green: "bg-accent-soft border-accent",
} as const;

type DashedButtonProps = React.ComponentProps<typeof Button> & {
  color?: keyof typeof COLORS;
};

export default function DashedButton({
  color = "green",
  className,
  ...props
}: DashedButtonProps) {
  return (
    <Button
      variant="outline"
      className={twMerge(
        "border-2 border-dashed rounded-xl",
        COLORS[color],
        className,
      )}
      {...props}
    />
  );
}
