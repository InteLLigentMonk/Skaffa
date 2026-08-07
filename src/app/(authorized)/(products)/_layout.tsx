import { Stack } from "expo-router";

const ProductsLayout = () => {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ title: "Produkter", headerShown: false }}
      />
    </Stack>
  );
};

export default ProductsLayout;
