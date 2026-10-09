import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import { Alert, Linking } from "react-native";
import {
  recipeImagePath,
  removeRecipeImages,
  uploadRecipeImage,
} from "../api";

export type RecipeImageStatus = "empty" | "uploading" | "done" | "error";
export type RecipeImageSource = "camera" | "library";

const MAX_SIDE = 1200;

type Options = {
  // undefined tills hem-frågan svarat; då går det inte att välja bild än.
  homeId: string | undefined;
  recipeId: string;
  // Formulärets image_path. Hooken skriver dit först när en uppladdning är
  // klar, så Spara aldrig skickar en sökväg till en fil som inte finns.
  onPathChange: (path: string | null) => void;
  initialPath?: string | null;
  initialUrl?: string | null;
};

export type UseRecipeImage = ReturnType<typeof useRecipeImage>;

export const useRecipeImage = ({
  homeId,
  recipeId,
  onPathChange,
  initialPath = null,
  initialUrl = null,
}: Options) => {
  const [status, setStatus] = useState<RecipeImageStatus>(
    initialPath ? "done" : "empty",
  );
  const [previewUri, setPreviewUri] = useState<string | null>(initialUrl);

  // Allt som laddats upp medan formuläret varit öppet. Vid sparning raderas
  // allt utom den sparade bilden, vid avbrott allt. Den bild receptet hade
  // innan formuläret öppnades finns aldrig här — den städas av triggern.
  const session = useRef({
    uploads: [] as string[],
    committed: false,
    discarded: false,
    attempt: 0,
    lastUri: null as string | null,
  });

  useEffect(() => {
    const s = session.current;
    // Nollställs här och inte bara i useRef: i dev kör React effekten två
    // gånger, och cleanupen däremellan hade annars markerat formuläret som
    // stängt.
    s.discarded = false;
    return () => {
      s.discarded = true;
      if (!s.committed) removeRecipeImages(s.uploads).catch(() => {});
    };
  }, []);

  const upload = async (uri: string) => {
    if (!homeId) return;
    const s = session.current;
    const attempt = ++s.attempt;
    const path = recipeImagePath(homeId, recipeId);

    s.lastUri = uri;
    setPreviewUri(uri);
    setStatus("uploading");
    // Den förra bilden gäller inte längre. Misslyckas uppladdningen ska
    // formuläret inte sparas med en bild användaren just bytt bort.
    onPathChange(null);

    try {
      await uploadRecipeImage(path, uri);
    } catch {
      if (attempt === s.attempt && !s.discarded) setStatus("error");
      return;
    }

    // Formuläret stängdes medan filen laddades upp: ingen kommer att spara
    // den, så den tas bort direkt i stället för att bli föräldralös.
    if (s.discarded) {
      removeRecipeImages([path]).catch(() => {});
      return;
    }

    s.uploads.push(path);
    if (attempt !== s.attempt) return;

    setStatus("done");
    onPathChange(path);
  };

  const pick = async (source: RecipeImageSource) => {
    if (!homeId) return;
    if (source === "camera" && !(await ensureCameraPermission())) return;

    // allowsEditing + aspect [1, 1]: iOS beskärning är alltid kvadratisk,
    // Android följer aspect. Biblioteket behöver ingen behörighet (PHPicker
    // på iOS, Photo Picker på Android 13+).
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    };
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

    if (result.canceled) return;

    const asset = result.assets[0];
    let uri: string;
    try {
      uri = await prepare(asset.uri, asset.width, asset.height);
    } catch {
      setPreviewUri(asset.uri);
      setStatus("error");
      return;
    }
    await upload(uri);
  };

  const retry = async () => {
    const { lastUri } = session.current;
    if (lastUri) await upload(lastUri);
  };

  // Storage-objektet rörs inte här. En sparad bild köas av triggern när
  // receptet sparas utan den; en osparad städas av commit/discard.
  const remove = () => {
    session.current.attempt++;
    session.current.lastUri = null;
    setPreviewUri(null);
    setStatus("empty");
    onPathChange(null);
  };

  // Anropas när receptet sparats med savedPath som image_path.
  const commit = (savedPath: string | null) => {
    const s = session.current;
    s.committed = true;
    removeRecipeImages(s.uploads.filter((path) => path !== savedPath)).catch(
      () => {},
    );
  };

  return {
    status,
    previewUri,
    isUploading: status === "uploading",
    pick,
    retry,
    remove,
    commit,
  };
};

// Nerskalad till högst 1200 px och omkodad till JPEG. Omkodningen görs även
// när bilden redan är liten: väljaren kan ge HEIC eller PNG.
async function prepare(uri: string, width: number, height: number) {
  const context = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > MAX_SIDE) {
    context.resize(
      width >= height ? { width: MAX_SIDE } : { height: MAX_SIDE },
    );
  }
  const image = await context.renderAsync();
  const result = await image.saveAsync({
    compress: 0.8,
    format: SaveFormat.JPEG,
  });
  return result.uri;
}

async function ensureCameraPermission() {
  const { granted } = await ImagePicker.requestCameraPermissionsAsync();
  if (granted) return true;

  // Har användaren nekat en gång frågar systemet inte igen, och
  // requestCameraPermissionsAsync svarar direkt med nej. Då är
  // inställningarna enda vägen.
  Alert.alert(
    "Kameran är avstängd",
    "Skaffa behöver tillgång till kameran för att fota receptet. Du kan slå på det i inställningarna.",
    [
      { text: "Avbryt", style: "cancel" },
      { text: "Öppna inställningar", onPress: () => Linking.openSettings() },
    ],
  );
  return false;
}
