import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://tbrlrkhtiqkqjfcwubws.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRicmxya2h0aXFrcWpmY3d1YndzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwNzYwMSwiZXhwIjoyMDc2MjgzNjAxfQ._BYSXaxUAP_qdMQS0xZD8oPu1wJXcW-l4q3eFC3Snn8"
);

async function run() {
  const { data, error } = await supabase.from("agencies").select("id, commercial_name, active");
  console.log("Error:", error);
  console.log("Data:", data);
}

run();
