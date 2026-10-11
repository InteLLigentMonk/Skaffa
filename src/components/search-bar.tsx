import { StyledIonicons } from "@/utils/helpers";
import { InputGroup, useBottomSheetAwareHandlers } from "heroui-native";

export type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

const SearchBar = ({ value, onChange, placeholder }: SearchBarProps) => {
  // I ett BottomSheet lyfter arket sig över tangentbordet med de här; utanför
  // ett ark är de no-ops, så sökfältet beter sig som förut överallt annars.
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();

  return (
    <InputGroup>
      <InputGroup.Prefix isDecorative>
        <StyledIonicons name="search" size={24} className="text-muted" />
      </InputGroup.Prefix>
      <InputGroup.Input
        placeholder={placeholder}
        value={value}
        onChangeText={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    </InputGroup>
  );
};

export default SearchBar;
