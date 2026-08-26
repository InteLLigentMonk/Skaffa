import { Enums } from "./database.types";

export type UnitType = Enums<"unit_type">;

export const UNIT_LABELS: Record<UnitType, string> = {
  gram: "g",
  deciliter: "dl",
  matsked: "msk",
  tesked: "tsk",
  kryddmatt: "krm",
  styck: "st",
};

export type Ingredient = {
  id: string;
  name: string;
  unit: UnitType;
};
