import { apiFetch } from "@/lib/api";
import type { NameFontRow, NameFrameRow, NamesPolicy } from "./names-data";

// --- Start: Names live wire (Sachin) ---
export type NamesBundle = {
  policy: NamesPolicy;
  frames: NameFrameRow[];
  fonts: NameFontRow[];
};

export async function fetchNamesBundle(): Promise<NamesBundle> {
  const data = await apiFetch<NamesBundle>("/api/v1/admin/names");
  return {
    policy: data.policy,
    frames: data.frames ?? [],
    fonts: data.fonts ?? [],
  };
}

export async function saveNamesBundle(
  bundle: NamesBundle,
): Promise<NamesBundle> {
  const data = await apiFetch<NamesBundle>("/api/v1/admin/names", {
    method: "PUT",
    body: JSON.stringify(bundle),
  });
  return {
    policy: data.policy,
    frames: data.frames ?? [],
    fonts: data.fonts ?? [],
  };
}
// --- End: Names live wire (Sachin) ---
