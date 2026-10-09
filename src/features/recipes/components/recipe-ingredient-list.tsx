import { CATEGORY_DOT_COLORS } from "@/features/ingredients/ingredient-types";
import { formatNumber, UNIT_LABELS, UnitCode } from "@/lib/units";
import { StyledIonicons } from "@/utils/helpers";
import { Separator, Typography } from "heroui-native";
import { Fragment } from "react";
import { View } from "react-native";
import { RecipeDetailIngredient } from "../recipe-types";

type Props = {
  ingredients: RecipeDetailIngredient[];
  /** Valda portioner delat med receptets egna. */
  factor: number;
};

// Mängden visas i den enhet receptet skrevs med, bara skalad. Styck avrundas
// till halvor — "1,33 lök" hjälper ingen vid spisen. Inköpslistan avrundar
// uppåt till hela på egen hand; det är en annan fråga (hur mycket man köper).
const scaledAmount = (amount: number, unit: UnitCode, factor: number) => {
  const scaled = amount * factor;
  if (unit === "styck") return Math.max(0.5, Math.round(scaled * 2) / 2);
  return scaled;
};

const RecipeIngredientList = ({ ingredients, factor }: Props) => {
  const hasPieces = ingredients.some((row) => row.displayUnit === "styck");

  return (
    <View>
      {ingredients.map((row, i) => (
        <Fragment key={row.id}>
          {i > 0 && <Separator />}
          <View className="flex-row items-center gap-3 py-3">
            <View
              className={`size-2 rounded-full ${CATEGORY_DOT_COLORS[row.category]}`}
            />
            <Typography.Paragraph className="flex-1">
              {row.name}
            </Typography.Paragraph>
            <Typography.Paragraph weight="bold">
              {formatNumber(
                scaledAmount(row.displayAmount, row.displayUnit, factor),
              )}{" "}
              {UNIT_LABELS[row.displayUnit]}
            </Typography.Paragraph>
          </View>
        </Fragment>
      ))}

      {hasPieces && (
        <View className="flex-row items-start gap-2 pt-2">
          <StyledIonicons
            name="information-circle-outline"
            size={16}
            className="text-muted"
          />
          <Typography.Paragraph type="body-xs" color="muted" className="flex-1">
            Styck kan visas i halvor här — på inköpslistan avrundas de alltid
            uppåt till hela.
          </Typography.Paragraph>
        </View>
      )}
    </View>
  );
};

export default RecipeIngredientList;
