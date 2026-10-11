import SearchBar from "@/components/search-bar";
import { StyledIonicons } from "@/utils/helpers";
import {
  Button,
  ListGroup,
  Separator,
  Spinner,
  Typography,
} from "heroui-native";
import { Fragment, useState } from "react";
import { View } from "react-native";
import { useIngredients } from "../hooks/use-ingredients";
import { CATEGORY_LABELS, PickerIngredient } from "../ingredient-types";
import Category from "./category";

// Få nog att mängdfälten syns under listan utan att man scrollar.
const MAX_SHOWN = 6;

type Props = {
  onPick: (ingredient: PickerIngredient) => void;
  onCreate: (name: string) => void;
  /** Ingredienser som visas men inte går att välja. */
  takenIds?: Set<string>;
  /** Undertexten på en sådan rad. */
  takenLabel?: string;
  /** Texten på knappen för ett namn som saknas. Förval: Skapa ”namn”. */
  createLabel?: (name: string) => string;
};

// Ingredienserna är redan laddade i sin helhet (useIngredients), så sökningen
// filtrerar lokalt — som IngredientsPicker i receptformuläret. Visar ett
// fåtal och låter sökningen göra resten, så väljaren kan ligga i en vanlig
// ScrollView eller ett ark utan en nästlad lista.
const IngredientSearch = ({
  onPick,
  onCreate,
  takenIds,
  takenLabel,
  createLabel = (name) => `Skapa ”${name}”`,
}: Props) => {
  const ingredients = useIngredients();
  const [term, setTerm] = useState("");

  const q = term.trim().toLocaleLowerCase("sv");
  const all = ingredients.data ?? [];
  const matches = all.filter((i) =>
    i.name.toLocaleLowerCase("sv").includes(q),
  );
  const shown = matches.slice(0, MAX_SHOWN);
  const hasExactMatch = all.some(
    (i) => i.name.toLocaleLowerCase("sv") === q,
  );

  return (
    <View className="gap-2">
      <SearchBar
        value={term}
        onChange={setTerm}
        placeholder="Sök ingrediens, t.ex. mjölk"
      />

      {q.length > 0 && !hasExactMatch && (
        <Button
          variant="tertiary"
          className="rounded-2xl border border-dashed border-accent bg-accent-soft"
          onPress={() => onCreate(term.trim())}
        >
          <StyledIonicons name="add" size={20} className="text-accent" />
          <Typography.Paragraph className="text-accent">
            {createLabel(term.trim())}
          </Typography.Paragraph>
        </Button>
      )}

      {ingredients.isPending ? (
        <View className="items-center py-6">
          <Spinner />
        </View>
      ) : ingredients.isError ? (
        <View className="items-center gap-2 py-4">
          <Typography.Paragraph color="muted">
            Kunde inte hämta ingredienserna.
          </Typography.Paragraph>
          <Button
            variant="secondary"
            size="sm"
            onPress={() => ingredients.refetch()}
          >
            <Button.Label>Försök igen</Button.Label>
          </Button>
        </View>
      ) : shown.length > 0 ? (
        <ListGroup>
          {shown.map((ingredient, i) => {
            const isTaken = takenIds?.has(ingredient.id) ?? false;
            return (
              <Fragment key={ingredient.id}>
                {i > 0 && <Separator className="mx-4" />}
                <ListGroup.Item
                  disabled={isTaken}
                  className={isTaken ? "opacity-50" : ""}
                  onPress={() => onPick(ingredient)}
                >
                  <ListGroup.ItemPrefix>
                    <Category category={ingredient.category} />
                  </ListGroup.ItemPrefix>
                  <ListGroup.ItemContent>
                    <ListGroup.ItemTitle>{ingredient.name}</ListGroup.ItemTitle>
                    <ListGroup.ItemDescription>
                      {isTaken && takenLabel
                        ? takenLabel
                        : CATEGORY_LABELS[ingredient.category]}
                    </ListGroup.ItemDescription>
                  </ListGroup.ItemContent>
                </ListGroup.Item>
              </Fragment>
            );
          })}
        </ListGroup>
      ) : null}

      {matches.length > MAX_SHOWN && (
        <Typography.Paragraph type="body-xs" color="muted" align="center">
          Visar {MAX_SHOWN} av {matches.length}. Sök för att hitta fler.
        </Typography.Paragraph>
      )}
    </View>
  );
};

export default IngredientSearch;
