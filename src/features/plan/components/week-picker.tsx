import {
  addDays,
  formatWeekRange,
  IsoDate,
  isoWeek,
  today,
  weekMonday,
} from "@/lib/dates";
import { StyledIonicons } from "@/utils/helpers";
import {
  Button,
  Chip,
  Popover,
  PressableFeedback,
  Separator,
  Typography,
} from "heroui-native";
import { Fragment, useState } from "react";
import { View } from "react-native";

type Props = {
  /** Måndagen i vald vecka. */
  value: IsoDate;
  onChange: (monday: IsoDate) => void;
  /** Veckorna som går att välja, som måndagar i ordning. */
  weeks: IsoDate[];
  /** Ifyllda måltider per vecka; utelämnas så visas ingen räknare. */
  filledByWeek?: Record<IsoDate, number>;
  /** Antal måltider en full vecka har (7 × synliga måltider). */
  capacity?: number;
  footer?: string;
};

const weekBadge = (monday: IsoDate): string | null => {
  const current = weekMonday(today());
  if (monday === current) return "Denna vecka";
  if (monday === addDays(current, 7)) return "Nästa vecka";
  return null;
};

// Kontrollerad som DayPicker: föräldern äger vald vecka och räknarna, så
// samma komponent fungerar i arket och på planeringssidan.
const WeekPicker = ({
  value,
  onChange,
  weeks,
  filledByWeek,
  capacity,
  footer,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  const index = weeks.indexOf(value);
  const badge = weekBadge(value);

  return (
    <View className="flex-row items-center gap-2 rounded-2xl bg-surface-secondary p-2">
      <Button
        variant="tertiary"
        size="sm"
        isIconOnly
        isDisabled={index <= 0}
        onPress={() => onChange(weeks[index - 1])}
        accessibilityLabel="Föregående vecka"
      >
        <StyledIonicons name="chevron-back" size={18} className="text-foreground" />
      </Button>

      {/* flex-1 på roten, inte på triggern: Popover renderar en egen View
          runt triggern, och det är den som är radens flexbarn. */}
      <Popover isOpen={isOpen} onOpenChange={setIsOpen} className="flex-1">
        <Popover.Trigger>
          <View className="items-center">
            <View className="flex-row items-center gap-2">
              {/* Rubriken är Fredoka, chippet Nunito. Androids font padding
                  skiljer sig mellan dem och flyttar texten i sin ruta, så
                  chippet såg förskjutet ut trots items-center. */}
              <Typography.Heading
                type="h6"
                weight="bold"
                style={{ includeFontPadding: false, textAlignVertical: "center" }}
              >
                Vecka {isoWeek(value)}
              </Typography.Heading>
              {badge && (
                <Chip size="sm" variant="soft" color="success">
                  <Chip.Label>{badge}</Chip.Label>
                </Chip>
              )}
            </View>
            <View className="flex-row items-center gap-1">
              <StyledIonicons
                name="chevron-down"
                size={12}
                className="text-muted"
              />
              <Typography.Paragraph type="body-xs" color="muted">
                {formatWeekRange(value)} · tryck för att byta
              </Typography.Paragraph>
            </View>
          </View>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Overlay />
          <Popover.Content presentation="popover" width="trigger" className="p-0">
            <Popover.Title className="px-4 pb-2 pt-4">Välj vecka</Popover.Title>
            {weeks.map((monday, i) => {
              const isSelected = monday === value;
              const rowBadge = weekBadge(monday);

              return (
                <Fragment key={monday}>
                  {i > 0 && <Separator />}
                  <PressableFeedback
                    onPress={() => {
                      onChange(monday);
                      setIsOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View
                      className={`flex-row items-center gap-2 px-4 py-3 ${
                        isSelected ? "bg-accent-soft" : ""
                      }`}
                    >
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                          <Typography.Paragraph weight="bold">
                            Vecka {isoWeek(monday)}
                          </Typography.Paragraph>
                          {rowBadge && (
                            <Chip size="sm" variant="soft" color="success">
                              <Chip.Label>{rowBadge}</Chip.Label>
                            </Chip>
                          )}
                        </View>
                        <Typography.Paragraph type="body-xs" color="muted">
                          {formatWeekRange(monday)}
                        </Typography.Paragraph>
                      </View>
                      {filledByWeek && capacity ? (
                        <Typography.Paragraph type="body-sm" weight="semibold">
                          {filledByWeek[monday] ?? 0}/{capacity}
                        </Typography.Paragraph>
                      ) : null}
                    </View>
                  </PressableFeedback>
                </Fragment>
              );
            })}
            {footer && (
              <>
                <Separator />
                <Typography.Paragraph
                  type="body-xs"
                  color="muted"
                  align="center"
                  className="px-4 py-3"
                >
                  {footer}
                </Typography.Paragraph>
              </>
            )}
          </Popover.Content>
        </Popover.Portal>
      </Popover>

      <Button
        variant="tertiary"
        size="sm"
        isIconOnly
        isDisabled={index === -1 || index >= weeks.length - 1}
        onPress={() => onChange(weeks[index + 1])}
        accessibilityLabel="Nästa vecka"
      >
        <StyledIonicons
          name="chevron-forward"
          size={18}
          className="text-foreground"
        />
      </Button>
    </View>
  );
};

export default WeekPicker;
