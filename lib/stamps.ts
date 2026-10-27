import type { FeatureType } from "@/lib/ai/types";
export const stampForType: Record<FeatureType, "star" | "planet" | "glitter"> =
  { mole: "star", freckle: "glitter", smile_line: "planet", other: "planet" };
export const featureLabels: Record<FeatureType, string> = {
  mole: "ほくろ",
  freckle: "そばかす",
  smile_line: "笑いじわ",
  other: "その他",
};
export const featureColors: Record<FeatureType, string> = {
  mole: "#b96813",
  freckle: "#37826d",
  smile_line: "#7356ac",
  other: "#247ec0",
};
