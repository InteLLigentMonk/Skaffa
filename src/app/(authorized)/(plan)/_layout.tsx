import { Stack } from "expo-router";

const PlanLayout = () => {
  return (
    <Stack>
      {/* Receptformuläret bor i rot-stacken, se app/_layout. En övergång som
          korsar en flikgräns kan inte animeras — flikbyten sätter nästlat
          läge i klump, så ingen stack får något att pusha. */}
      <Stack.Screen
        name="index"
        options={{ title: "Veckoplan", headerShown: false }}
      />
    </Stack>
  );
};

export default PlanLayout;
