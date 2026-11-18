import { useStore } from "@tanstack/react-store";
import { logoFor, prefsStore, shownMode } from "#/lib/prefs";
import { cn } from "#/lib/utils";

/** The Oryn mark in the current theme's stamp ink (Mint wears the original). */
export function Logo({
	size = 28,
	className,
	label,
}: {
	size?: number;
	className?: string;
	/** Give a label only where the mark stands alone; beside the word Oryn it is decorative. */
	label?: string;
}) {
	const palette = useStore(prefsStore, (s) => s.palette);
	const mode = useStore(shownMode, (s) => s);
	const height = Math.round(size * (375 / 406));
	return (
		<img
			src={logoFor(palette, mode)}
			alt={label ?? ""}
			aria-hidden={label ? undefined : true}
			width={size}
			height={height}
			decoding="async"
			className={cn("shrink-0 select-none", className)}
			style={{ width: size, height }}
			draggable={false}
		/>
	);
}
