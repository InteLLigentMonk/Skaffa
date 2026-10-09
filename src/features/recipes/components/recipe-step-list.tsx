import { Typography } from "heroui-native";
import { View } from "react-native";
import { RecipeDetailStep } from "../recipe-types";

const RecipeStepList = ({ steps }: { steps: RecipeDetailStep[] }) => {
  // Receptformuläret har inga steg ännu, så tomt är det vanliga fallet.
  if (steps.length === 0) {
    return (
      <Typography.Paragraph type="body-sm" color="muted">
        Receptet har inga steg än.
      </Typography.Paragraph>
    );
  }

  return (
    <View className="gap-4">
      {steps.map((step, i) => (
        <View key={step.position} className="flex-row gap-3">
          <View className="size-7 items-center justify-center rounded-lg bg-accent">
            <Typography.Paragraph
              type="body-sm"
              weight="bold"
              className="text-accent-foreground"
            >
              {i + 1}
            </Typography.Paragraph>
          </View>
          <Typography.Paragraph className="flex-1">
            {step.content}
          </Typography.Paragraph>
        </View>
      ))}
    </View>
  );
};

export default RecipeStepList;
