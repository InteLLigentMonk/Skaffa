import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Varumärkesfärger, inte tema. GREEN måste matcha backgroundColor för
// expo-splash-screen och adaptiveIcon i app.json, annars blinkar det i
// övergången från den inbyggda splashen.
const GREEN = "#15803D";
const WHITE = "#FFFFFF";
const ORANGE = "#FB923C";
const TAGLINE_COLOR = "#F0FDF4";

// Symbolens viewBox är 74 × 72 (samma som i assets/svg/mark-on-green.svg).
const VB_W = 74;
const VB_H = 72;
const CART_D = "M20.5 29 H30.5 L38.5 63 H72.5 L79.5 39 H33";
const CART_LENGTH = 151; // vagnens linjelängd, avrundad uppåt
const LEAF_D = "M62.5 32 C62.5 23 68.5 18 77.5 18 C77.5 27 71.5 32 62.5 32 Z";
const WORD = ["S", "k", "a", "f", "f", "a"];

type Props = {
  /** Anropas när animationen har tonat ut och appen kan visas. */
  onFinish?: () => void;
  /** Symbolens bredd i dp. */
  size?: number;
  /** Rita upp vagnen från tomt (true) eller börja med vagnen synlig (false). */
  drawIn?: boolean;
  /** Tagline under ordbilden. null döljer den. */
  tagline?: string | null;
};

function Letter({ char, delay }: { char: string; delay: number }) {
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withDelay(
      delay,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.back(1.6)) }),
    );
  }, [delay, p]);

  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, p.value * 1.5),
    transform: [{ translateY: (1 - p.value) * 22 }],
  }));

  return <Animated.Text style={[styles.letter, style]}>{char}</Animated.Text>;
}

function Splash({
  onFinish,
  size = 185,
  drawIn = true,
  tagline = "Planera veckan. Handla smart.",
}: Props) {
  const start = drawIn ? 0 : 1;
  const draw = useSharedValue(start);
  const wheelA = useSharedValue(start);
  const wheelB = useSharedValue(start);
  const leaf = useSharedValue(start);
  const pop = useSharedValue(drawIn ? 0.86 : 1);
  const taglineOpacity = useSharedValue(0);
  const screenOpacity = useSharedValue(1);

  // Utan uppritning börjar ordbilden direkt.
  const base = drawIn ? 0 : -900;

  useEffect(() => {
    const backOut = Easing.out(Easing.back(1.8));

    if (drawIn) {
      draw.value = withTiming(1, {
        duration: 900,
        easing: Easing.inOut(Easing.cubic),
      });
      pop.value = withTiming(1, { duration: 900, easing: backOut });
      wheelA.value = withDelay(
        600,
        withTiming(1, { duration: 400, easing: backOut }),
      );
      wheelB.value = withDelay(
        720,
        withTiming(1, { duration: 400, easing: backOut }),
      );
      leaf.value = withDelay(
        900,
        withTiming(1, { duration: 550, easing: backOut }),
      );
    } else {
      pop.value = withSequence(
        withTiming(1.06, { duration: 180, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 260, easing: backOut }),
      );
    }

    taglineOpacity.value = withDelay(
      base + 1900,
      withTiming(1, { duration: 600 }),
    );
    screenOpacity.value = withDelay(
      base + 3100,
      withTiming(0, { duration: 350 }),
    );

    const done = setTimeout(() => onFinish?.(), base + 3450);
    return () => clearTimeout(done);
    // Körs en gång när komponenten monteras.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cartProps = useAnimatedProps(() => ({
    strokeDashoffset: (1 - draw.value) * CART_LENGTH,
    strokeOpacity: draw.value > 0.02 ? 1 : 0,
  }));
  const wheelAProps = useAnimatedProps(() => ({
    r: Math.max(0, wheelA.value * 5),
  }));
  const wheelBProps = useAnimatedProps(() => ({
    r: Math.max(0, wheelB.value * 5),
  }));

  const markStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
  }));
  const leafStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, leaf.value * 2),
    transform: [
      { scale: Math.max(0, leaf.value) },
      { rotate: `${(1 - leaf.value) * -40}deg` },
    ],
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));
  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  const height = (size * VB_H) / VB_W;
  const unit = size / VB_W;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.screen, screenStyle]}
      accessibilityLabel="Skaffa"
    >
      <Animated.View style={[{ width: size, height }, markStyle]}>
        <Svg width={size} height={height} viewBox={`13 14 ${VB_W} ${VB_H}`}>
          <AnimatedPath
            d={CART_D}
            fill="none"
            stroke={WHITE}
            strokeWidth={8}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={[CART_LENGTH, CART_LENGTH + 50]}
            animatedProps={cartProps}
          />
          <AnimatedCircle
            cx={44.5}
            cy={77}
            fill={WHITE}
            animatedProps={wheelAProps}
          />
          <AnimatedCircle
            cx={68.5}
            cy={77}
            fill={WHITE}
            animatedProps={wheelBProps}
          />
        </Svg>

        {/* Bladet ligger i en egen vy så att det kan växa ut från sitt fäste. */}
        <Animated.View
          style={[
            {
              position: "absolute",
              left: (62.5 - 13) * unit,
              top: (18 - 14) * unit,
              width: 15 * unit,
              height: 14 * unit,
              transformOrigin: "left bottom",
            },
            leafStyle,
          ]}
        >
          <Svg width="100%" height="100%" viewBox="62.5 18 15 14">
            <Path d={LEAF_D} fill={ORANGE} />
          </Svg>
        </Animated.View>
      </Animated.View>

      <View style={styles.word}>
        {WORD.map((char, i) => (
          <Letter
            key={i}
            char={char}
            delay={Math.max(0, base + 1100 + i * 60)}
          />
        ))}
      </View>

      {tagline ? (
        <Animated.Text style={[styles.tagline, taglineStyle]}>
          {tagline}
        </Animated.Text>
      ) : null}
    </Animated.View>
  );
}

/**
 * Animerad splash som tar över efter den inbyggda (helt gröna) splashen.
 * Ligger ovanpå appen med samma gröna bakgrund, spelar ~3,5 s och tonar ut.
 *
 * Med "minska rörelse"/"ta bort animationer" påslaget hoppas den över helt.
 * Kräver att Fredoka_500Medium och Fredoka_700Bold är laddade.
 */
export default function AnimatedSplash(props: Props) {
  const reduceMotion = useReducedMotion();
  const { onFinish } = props;

  useEffect(() => {
    if (reduceMotion) onFinish?.();
  }, [reduceMotion, onFinish]);

  if (reduceMotion) return null;
  return <Splash {...props} />;
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    pointerEvents: "none",
  },
  word: {
    flexDirection: "row",
    marginTop: 18,
  },
  letter: {
    fontFamily: "Fredoka_700Bold",
    fontSize: 64,
    lineHeight: 72,
    letterSpacing: -1,
    color: WHITE,
  },
  tagline: {
    marginTop: 12,
    fontFamily: "Fredoka_500Medium",
    fontSize: 17,
    color: TAGLINE_COLOR,
  },
});
