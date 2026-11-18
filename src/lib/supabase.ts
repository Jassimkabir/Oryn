import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/** Null until the Supabase project is connected (.env.local). */
export const supabase =
	url && key
		? createClient(url, key, {
				auth: {
					persistSession: true,
					autoRefreshToken: true,
					// The emailed sign-in link lands back on the app with the session in the
					// address; implicit flow lets it open in any browser on the phone.
					detectSessionInUrl: true,
					flowType: "implicit",
				},
			})
		: null;
