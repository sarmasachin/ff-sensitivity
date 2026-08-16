import { apiFetch } from "@/lib/api";
import type { NameFontRow, NameFrameRow, NamesPolicy } from "./names-data";

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

export async function saveNamesBundle(bundle: {
  policy: NamesPolicy;
  frames?: NameFrameRow[];
  fonts?: NameFontRow[];
}): Promise<NamesBundle> {
  const body: {
    policy: NamesPolicy;
    frames?: NameFrameRow[];
    fonts?: NameFontRow[];
  } = { policy: bundle.policy };
  if (bundle.frames !== undefined) body.frames = bundle.frames;
  if (bundle.fonts !== undefined) body.fonts = bundle.fonts;
  const data = await apiFetch<NamesBundle>("/api/v1/admin/names", {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return {
    policy: data.policy,
    frames: data.frames ?? [],
    fonts: data.fonts ?? [],
  };
}

export async function createNameFrame(
  row: NameFrameRow,
): Promise<NameFrameRow> {
  return apiFetch<NameFrameRow>("/api/v1/admin/names/frames", {
    method: "POST",
    body: JSON.stringify(row),
  });
}

export async function updateNameFrame(
  id: string,
  row: NameFrameRow,
): Promise<NameFrameRow> {
  return apiFetch<NameFrameRow>(
    `/api/v1/admin/names/frames/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify({ ...row, id }),
    },
  );
}

export async function deleteNameFrame(id: string): Promise<void> {
  await apiFetch(`/api/v1/admin/names/frames/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function updateNameFont(
  id: string,
  row: NameFontRow,
): Promise<NameFontRow> {
  return apiFetch<NameFontRow>(
    `/api/v1/admin/names/fonts/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify({ ...row, id }),
    },
  );
}
