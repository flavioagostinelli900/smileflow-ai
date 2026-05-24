import type { AgeGroup } from "./api";

export function computeAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

export function computeAgeGroup(birthDate: string | null | undefined): AgeGroup {
  const age = computeAge(birthDate);
  if (age == null) return "unspecified";
  return age < 18 ? "pediatric" : "adult";
}

export const AGE_GROUP_LABEL: Record<AgeGroup, string> = {
  adult: "Adulto",
  pediatric: "Pediatrico",
  unspecified: "Non specificato",
};

export const AGE_GROUP_EMOJI: Record<AgeGroup, string> = {
  adult: "👤",
  pediatric: "👶",
  unspecified: "•",
};

export const PATIENT_GROUP_LABEL = {
  adults: "Adulti",
  children: "Bambini",
  all: "Tutti",
} as const;

export const PATIENT_GROUP_EMOJI = {
  adults: "👤",
  children: "👶",
  all: "👥",
} as const;

export function isOperatorCompatible(
  operatorGroup: "adults" | "children" | "all",
  patientGroup: AgeGroup,
): boolean {
  if (operatorGroup === "all") return true;
  if (patientGroup === "adult") return operatorGroup === "adults";
  if (patientGroup === "pediatric") return operatorGroup === "children";
  return true; // unspecified → any
}
