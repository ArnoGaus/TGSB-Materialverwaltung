import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://gzneayfjpvcfpdaqzevr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bmVheWZqcHZjZnBkYXF6ZXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1ODM4NDUsImV4cCI6MjA4NzE1OTg0NX0.v5NJARFQuotDrgLZZkJ2p228s6LCWTIF-QRmyZIoTbs"
);
