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
