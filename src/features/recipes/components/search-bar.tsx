import { StyledIonicons } from "@/utils/helpers";
import { InputGroup } from "heroui-native";

const SearchBar = () => {
  return (
    <InputGroup>
      <InputGroup.Prefix isDecorative>
        <StyledIonicons name="search" size={24} className="text-muted" />
      </InputGroup.Prefix>
      <InputGroup.Input placeholder="Username" />
    </InputGroup>
  );
};

export default SearchBar;
