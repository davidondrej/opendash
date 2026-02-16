import FileManager from "@/components/file-manager";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type FileRecord = {
  id: string;
  name: string;
  content: string;
  updated_at: string;
};

async function getInitialFiles(): Promise<FileRecord[]> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("files")
      .select("id,name,content,updated_at")
      .order("updated_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Failed to load initial files:", error.message);
      return [];
    }
    return data ?? [];
  } catch (error) {
    console.error("Failed to load initial files:", error);
    return [];
  }
}

export default async function Home() {
  const initialFiles = await getInitialFiles();
  return <FileManager initialFiles={initialFiles} />;
}
