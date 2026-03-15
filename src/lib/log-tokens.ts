import { createClient } from "@supabase/supabase-js"

export async function logTokens(userId: string, feature: string, inputTokens: number, outputTokens: number) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    await supabase.from("token_usage").insert({
      user_id: userId,
      feature,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
    })
  } catch { /* non-critical, don't throw */ }
}
