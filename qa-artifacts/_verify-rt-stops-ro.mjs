import { createClient } from "@supabase/supabase-js";
import {
  assertStagingEnv,
  extractSupabaseProjectRef,
} from "../backend/scripts/assert-staging-env.mjs";

assertStagingEnv(process.env);
const ref = extractSupabaseProjectRef(process.env.SUPABASE_URL);
if (ref !== "yveadybpntziyryxsrsu") process.exit(2);
const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const { data: inst } = await sb
  .from("institute")
  .select("id")
  .eq("code", "lx-staging-transport-rt")
  .is("deleted_at", null)
  .maybeSingle();
const { data: route } = await sb
  .from("route")
  .select("id")
  .eq("institute_id", inst.id)
  .eq("name", "Staging RT Route")
  .is("deleted_at", null)
  .maybeSingle();
const { data: stops } = await sb
  .from("stop")
  .select("name,route_order,kind")
  .eq("route_id", route.id)
  .is("deleted_at", null)
  .order("route_order");
const emails = [
  "smoke.staging.transport.rt.child1@lumenx.test",
  "smoke.staging.transport.rt.child2@lumenx.test",
  "smoke.staging.transport.rt.child3@lumenx.test",
];
const mapping = [];
for (const email of emails) {
  const { data: p } = await sb
    .from("user_profile")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  const { data: st } = await sb
    .from("student")
    .select("id")
    .eq("user_profile_id", p.id)
    .eq("institute_id", inst.id)
    .is("deleted_at", null)
    .maybeSingle();
  const { data: en } = await sb
    .from("transport_enrollment")
    .select("pickup_stop_id,drop_stop_id")
    .eq("student_id", st.id)
    .eq("route_id", route.id)
    .is("deleted_at", null)
    .maybeSingle();
  const pickup = (stops || []).find(() => false);
  const { data: ps } = await sb
    .from("stop")
    .select("name,route_order")
    .eq("id", en.pickup_stop_id)
    .maybeSingle();
  const { data: ds } = await sb
    .from("stop")
    .select("name,route_order")
    .eq("id", en.drop_stop_id)
    .maybeSingle();
  mapping.push({
    email,
    pickup: ps?.name,
    pickup_order: ps?.route_order,
    drop: ds?.name,
  });
}
console.log(JSON.stringify({ stops, mapping }, null, 2));
