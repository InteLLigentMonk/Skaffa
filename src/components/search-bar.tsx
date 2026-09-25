import { StyledIonicons } from "@/utils/helpers";
import { InputGroup } from "heroui-native";

export type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

const SearchBar = ({ value, onChange, placeholder }: SearchBarProps) => {
  return (
    <InputGroup>
      <InputGroup.Prefix isDecorative>
        <StyledIonicons name="search" size={24} className="text-muted" />
      </InputGroup.Prefix>
      <InputGroup.Input
        placeholder={placeholder}
        value={value}
        onChangeText={onChange}
      />
    </InputGroup>
  );
};

export default SearchBar;
