import * as Linking from "expo-linking";

export const buildInviteLink = (token: string) =>
  Linking.createURL("join", { queryParams: { token } });

/**
 * Inversen av buildInviteLink. Linking.parse och inte new URL(): custom
 * schemes parsas inte pålitligt av URL-polyfillen i RN.
 *
 * Samma länk ser olika ut beroende på hur appen körs:
 *   skaffa://join?token=x        -> hostname "join", path null
 *   exp://192.168.1.5:8081/--/join?token=x -> path "join"
 * Därför provas båda. Returnerar null för allt som inte är en join-länk,
 * inklusive recovery-länkar.
 */
export const parseInviteLink = (url: string) => {
  try {
    const { hostname, path, queryParams } = Linking.parse(url);
    const target = path?.replace(/^\/+/, "") || hostname;
    if (target !== "join") return null;

    const token = queryParams?.token;
    return typeof token === "string" && token.length > 0 ? token : null;
  } catch {
    return null;
  }
};

export const parseRecoveryLink = (url: string) => {
  try {
    const fragment = new URL(url).hash.replace(/^#/, "");
    const params = new URLSearchParams(fragment);

    if (params.get("type") !== "recovery") return null;

    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (!access_token || !refresh_token) return null;

    return { access_token, refresh_token };
  } catch {
    return null;
  }
};
