import SearchBar from "@/components/search-bar";
import { useRecipeSearch } from "@/features/recipes/hooks/use-recipes";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  Button,
  ListGroup,
  Separator,
  Spinner,
  Typography,
} from "heroui-native";
import { Fragment, useState } from "react";
import { View } from "react-native";

type Props = {
  onPick: (recipe: { id: string; name: string }) => void;
};

// Få nog att Måltid och Dagar syns under listan utan att man scrollar.
const MAX_SHOWN = 6;

// Bara hemmets recept: planned_meals och standing_meals kan bara peka på dem.
// Visar ett fåtal och låter sökningen göra resten, så väljaren kan ligga i en
// vanlig ScrollView utan en nästlad lista.
const RecipePicker = ({ onPick }: Props) => {
  const [term, setTerm] = useState("");
  const query = useDebouncedValue(term.trim());
  const search = useRecipeSearch("home", { query, quick: false, diet: null });
  // Kapas i klienten i stället för ett eget _limit: frågan blir då samma som
  // receptflikens och delar dess cache.
  const firstPage = search.data?.pages[0] ?? [];
  const recipes = firstPage.slice(0, MAX_SHOWN);
  const hasMore = firstPage.length > MAX_SHOWN || search.hasNextPage;

  return (
    <View className="gap-2">
      <SearchBar
        value={term}
        onChange={setTerm}
        placeholder="Sök bland hemmets recept"
      />

      {search.isPending ? (
        <View className="items-center py-6">
          <Spinner />
        </View>
      ) : search.isError ? (
        <View className="items-center gap-2 py-4">
          <Typography.Paragraph color="muted">
            Kunde inte hämta recepten.
          </Typography.Paragraph>
          <Button variant="secondary" size="sm" onPress={() => search.refetch()}>
            <Button.Label>Försök igen</Button.Label>
          </Button>
        </View>
      ) : recipes.length === 0 ? (
        <Typography.Paragraph color="muted" className="py-4" align="center">
          {query
            ? "Inga recept matchar sökningen."
            : "Hemmet har inga recept än. Spara ett recept först."}
        </Typography.Paragraph>
      ) : (
        <ListGroup>
          {recipes.map((recipe, i) => (
            <Fragment key={recipe.id}>
              {i > 0 && <Separator className="mx-4" />}
              <ListGroup.Item onPress={() => onPick(recipe)}>
                <ListGroup.ItemContent>
                  <ListGroup.ItemTitle>{recipe.name}</ListGroup.ItemTitle>
                </ListGroup.ItemContent>
                <ListGroup.ItemSuffix />
              </ListGroup.Item>
            </Fragment>
          ))}
        </ListGroup>
      )}

      {hasMore && (
        <Typography.Paragraph type="body-xs" color="muted" align="center">
          {query
            ? `Visar de ${MAX_SHOWN} bästa träffarna.`
            : `Visar de ${MAX_SHOWN} senaste. Sök för att hitta fler.`}
        </Typography.Paragraph>
      )}
    </View>
  );
};

export default RecipePicker;
