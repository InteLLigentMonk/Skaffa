import { isoWeek } from "@/lib/dates";
import { Typography } from "heroui-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { CostPoint, formatKr } from "../shopping-list-types";

const CHART_HEIGHT = 128;

type Props = {
  points: CostPoint[];
  average: number;
};

// Vanliga Views i stället för ett diagrambibliotek: en serie staplar och en
// snittlinje är allt grafen behöver. En serie, så ingen förklaring — rubriken
// i arket säger vad staplarna är. Tryck på en stapel för veckans belopp.
const CostChart = ({ points, average }: Props) => {
  const [selected, setSelected] = useState(points.length - 1);
  const max = Math.max(...points.map((p) => p.totalCost), average);
  const point = points[selected] ?? points[points.length - 1];

  return (
    <View className="gap-2">
      <Typography.Paragraph type="body-sm" color="muted">
        Vecka {isoWeek(point.weekStart)} ·{" "}
        <Typography.Paragraph type="body-sm" weight="bold">
          {formatKr(point.totalCost)}
        </Typography.Paragraph>
      </Typography.Paragraph>

      <View style={{ height: CHART_HEIGHT }}>
        <View className="absolute inset-0 flex-row items-end gap-0.5">
          {points.map((p, i) => (
            <Pressable
              key={p.weekStart}
              onPress={() => setSelected(i)}
              // Hela kolumnens höjd är träffytan, inte bara stapeln.
              className="h-full flex-1 justify-end"
              accessibilityRole="button"
              accessibilityLabel={`Vecka ${isoWeek(p.weekStart)}, ${formatKr(p.totalCost)}`}
              accessibilityState={{ selected: i === selected }}
            >
              <View
                className={`rounded-t ${i === selected ? "bg-accent" : "bg-accent/40"}`}
                style={{
                  height: Math.max(4, (p.totalCost / max) * CHART_HEIGHT),
                }}
              />
            </Pressable>
          ))}
        </View>

        {/* Snittlinjen ovanpå staplarna, men den ska inte ta trycken. */}
        <View
          pointerEvents="none"
          className="absolute inset-x-0 border-t border-dashed border-foreground/50"
          style={{ bottom: (average / max) * CHART_HEIGHT }}
        />
      </View>

      <View className="flex-row justify-between">
        <Typography.Paragraph type="body-xs" color="muted">
          v. {isoWeek(points[0].weekStart)}
        </Typography.Paragraph>
        <Typography.Paragraph type="body-xs" color="muted">
          - - snitt {formatKr(average)}
        </Typography.Paragraph>
        <Typography.Paragraph type="body-xs" color="muted">
          v. {isoWeek(points[points.length - 1].weekStart)}
        </Typography.Paragraph>
      </View>
    </View>
  );
};

export default CostChart;
