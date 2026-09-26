import { StyledIonicons } from "@/utils/helpers";
import { PressableFeedback } from "heroui-native";

const Fab = ({ onPress }: { onPress: () => void }) => {
  return (
    <PressableFeedback
      onPress={onPress}
      className="absolute bottom-4 right-4 w-16 h-16 rounded-3xl bg-orange-600 flex items-center justify-center shadow-lg"
    >
      <StyledIonicons name="add" size={36} className="text-stone-950" />
    </PressableFeedback>
  );
};

export default Fab;
