import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { lazy, Suspense, useEffect, useState } from "react";
import { closeQuickAdd, openQuickAdd, quickAddStore } from "#/lib/groups";
import { postDueRecurring } from "#/lib/recurring";
import { syncStore } from "#/lib/sync";
import { TabBar } from "#/ui/TabBar";

// The sheet pulls in Motion + Base UI; load it after first paint, not on the critical path.
const loadQuickAdd = () => import("#/ui/QuickAdd");
const QuickAdd = lazy(() =>
	loadQuickAdd().then((m) => ({ default: m.QuickAdd })),
);

export const Route = createFileRoute("/_app")({
	component: AppLayout,
});

function AppLayout() {
	const adding = useStore(quickAddStore, (s) => s.open);
	const status = useStore(syncStore, (s) => s.status);
	const [mounted, setMounted] = useState(false);

	// Opening from a group screen before the sheet has loaded still works.
	useEffect(() => {
		if (adding) setMounted(true);
	}, [adding]);

	// Recurring payments that fall due.
	useEffect(() => {
		postDueRecurring();
		const hourly = window.setInterval(postDueRecurring, 60 * 60 * 1000);
		return () => window.clearInterval(hourly);
	}, []);

	useEffect(() => {
		const idle =
			window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1200));
		idle(() => {
			loadQuickAdd();
			setMounted(true);
		});
	}, []);

	// With Supabase set up, the app needs you signed in. Without it, it runs on the phone alone.
	if (status === "signed-out") return <Navigate to="/sign-in" replace />;

	return (
		<>
			<div aria-hidden className="ambient" />
			<Outlet />
			<TabBar
				onAdd={() => {
					setMounted(true);
					openQuickAdd(null);
				}}
			/>
			{mounted && (
				<Suspense fallback={null}>
					<QuickAdd
						open={adding}
						onOpenChange={(o) => (o ? openQuickAdd(null) : closeQuickAdd())}
					/>
				</Suspense>
			)}
		</>
	);
}
