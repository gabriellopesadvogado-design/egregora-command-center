import { supabase } from "@/integrations/supabase/client";

const BUCKET = "proposal_templates";
const PREFIX = "pt";

function getPageUrl(page: number): string {
  const fileName = `${PREFIX}/page-${String(page).padStart(2, "0")}.png`;
  return supabase.storage.from(BUCKET).getPublicUrl(fileName).data.publicUrl;
}

export const TEMPLATE_PAGES: string[] = Array.from({ length: 14 }, (_, i) =>
  getPageUrl(i + 1)
);

export const TEMPLATE_SIZE = { width: 810, height: 1440 } as const;
