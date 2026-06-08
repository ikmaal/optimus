/** Runtime feature flags for the AI check-in capture. */
export type InspectionConfig = {
  /** AI scanning is wired up (OpenAI + Supabase env present). */
  enabled: boolean;
  /** Driver may skip scanning (dev only). */
  allowSkip: boolean;
};

export function inspectionConfig(): InspectionConfig {
  const enabled = Boolean(
    process.env.OPENAI_API_KEY &&
      process.env.SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const allowSkip = process.env.NODE_ENV !== "production";
  return { enabled, allowSkip };
}
