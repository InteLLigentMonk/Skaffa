import { Stack } from "expo-router";

const ProductsLayout = () => {
  return (
    <Stack>
      {/* new-product bor i rot-stacken, se app/_layout. En övergång som korsar
          en flikgräns kan inte animeras — flikbyten sätter nästlat läge i
          klump, så ingen stack får något att pusha. */}
      <Stack.Screen
        name="index"
        options={{ title: "Produkter", headerShown: false }}
      />
    </Stack>
  );
};

export default ProductsLayout;
