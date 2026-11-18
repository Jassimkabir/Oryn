import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { del, get, set } from "idb-keyval";

export function createQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 30_000,
				gcTime: 1000 * 60 * 60 * 24 * 7,
				refetchOnWindowFocus: true,
			},
		},
	});
}

/** Query cache saved to IndexedDB so the app opens with data instantly. */
export const queryPersister =
	typeof window === "undefined"
		? undefined
		: createAsyncStoragePersister({
				storage: {
					getItem: (k) => get<string>(k).then((v) => v ?? null),
					setItem: (k, v) => set(k, v),
					removeItem: (k) => del(k),
				},
				key: "oryn:query-cache",
				throttleTime: 1000,
			});
