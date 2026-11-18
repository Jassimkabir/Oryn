import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import {
	type GlassLevel,
	logoFor,
	type Mode,
	PALETTES,
	type PaletteId,
	prefsStore,
	setPrefs,
	shownMode,
	type TextSize,
} from "#/lib/prefs";
import { withThemeReveal } from "#/lib/reveal";
import { cn, haptic } from "#/lib/utils";
import { Screen } from "#/ui/Screen";
import { Group, Segmented, ToggleRow } from "#/ui/SettingsList";

export const Route = createFileRoute("/_app/settings/appearance")({
	component: Appearance,
});

/* Each swatch is that theme's ambient light in the mode you're in, so you see what you'll get. */
const SHEET: Record<"light" | "dark", Record<PaletteId, string>> = {
	light: {
		original:
			"radial-gradient(90% 80% at 0% 0%, oklch(0.83 0.1 295), transparent 70%), radial-gradient(80% 80% at 100% 100%, oklch(0.87 0.08 225), transparent 70%), oklch(0.965 0.012 285)",
		pink: "radial-gradient(90% 80% at 0% 0%, oklch(0.85 0.09 350), transparent 70%), radial-gradient(80% 80% at 100% 100%, oklch(0.89 0.07 45), transparent 70%), oklch(0.965 0.018 350)",
		canary:
			"radial-gradient(90% 80% at 0% 0%, oklch(0.91 0.11 95), transparent 70%), radial-gradient(80% 80% at 100% 100%, oklch(0.88 0.08 150), transparent 70%), oklch(0.97 0.03 95)",
		green:
			"radial-gradient(90% 80% at 0% 0%, oklch(0.87 0.09 155), transparent 70%), radial-gradient(80% 80% at 100% 100%, oklch(0.86 0.07 300), transparent 70%), oklch(0.965 0.02 155)",
		sky: "radial-gradient(90% 80% at 0% 0%, oklch(0.85 0.08 235), transparent 70%), radial-gradient(80% 80% at 100% 100%, oklch(0.89 0.06 185), transparent 70%), oklch(0.965 0.016 235)",
		mint: "radial-gradient(90% 80% at 0% 0%, oklch(0.87 0.08 168), transparent 70%), radial-gradient(80% 80% at 100% 100%, oklch(0.88 0.06 205), transparent 70%), oklch(0.965 0.02 170)",
	},
	dark: {
		original:
			"radial-gradient(90% 80% at 0% 0%, oklch(0.38 0.14 295), transparent 70%), radial-gradient(80% 80% at 100% 100%, oklch(0.34 0.09 235), transparent 70%), oklch(0.18 0.03 280)",
		pink: "radial-gradient(90% 80% at 0% 0%, oklch(0.38 0.13 350), transparent 70%), radial-gradient(80% 80% at 100% 100%, oklch(0.35 0.08 40), transparent 70%), oklch(0.18 0.03 345)",
		canary:
			"radial-gradient(90% 80% at 0% 0%, oklch(0.38 0.08 95), transparent 70%), radial-gradient(80% 80% at 100% 100%, oklch(0.34 0.08 150), transparent 70%), oklch(0.18 0.025 100)",
		green:
			"radial-gradient(90% 80% at 0% 0%, oklch(0.36 0.09 155), transparent 70%), radial-gradient(80% 80% at 100% 100%, oklch(0.36 0.11 300), transparent 70%), oklch(0.18 0.03 160)",
		sky: "radial-gradient(90% 80% at 0% 0%, oklch(0.38 0.1 240), transparent 70%), radial-gradient(80% 80% at 100% 100%, oklch(0.36 0.07 190), transparent 70%), oklch(0.18 0.03 240)",
		mint: "radial-gradient(90% 80% at 0% 0%, oklch(0.38 0.08 168), transparent 70%), radial-gradient(80% 80% at 100% 100%, oklch(0.34 0.07 210), transparent 70%), oklch(0.18 0.03 185)",
	},
};

function Appearance() {
	const p = useStore(prefsStore, (s) => s);
	const mode = useStore(shownMode, (s) => s);

	return (
		<Screen title="Appearance" back={{ to: "/settings", label: "Settings" }}>
			<section className="mt-4" aria-labelledby="theme-h">
				<h2
					id="theme-h"
					className="mb-1.5 px-4 text-xs font-semibold tracking-[0.06em] text-muted uppercase"
				>
					Theme
				</h2>
				<fieldset className="grid grid-cols-3 gap-2.5">
					<legend className="sr-only">Theme</legend>
					{PALETTES.map((x) => {
						const active = p.palette === x.id;
						return (
							<label
								key={x.id}
								className={cn(
									"glass liquid pressable cursor-pointer rounded-[var(--radius-row)] p-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[color:var(--stamp)]",
									active && "shadow-[inset_0_0_0_2px_var(--stamp)]",
								)}
							>
								<input
									type="radio"
									name="palette"
									value={x.id}
									checked={active}
									className="sr-only"
									onChange={(e) => {
										haptic("tap");
										const el = e.currentTarget.parentElement;
										withThemeReveal(() => setPrefs({ palette: x.id }), el);
									}}
								/>
								<span
									className="grid h-16 place-items-center rounded-[0.7rem] shadow-[inset_0_0_0_1px_var(--rule)]"
									style={{ background: SHEET[mode][x.id] }}
								>
									<img
										src={logoFor(x.id, mode)}
										alt=""
										aria-hidden
										width={30}
										height={28}
										className="h-7 w-[30px]"
									/>
								</span>
								<span className="mt-1.5 block px-0.5 text-sm font-semibold">
									{x.name}
								</span>
								<span className="block px-0.5 text-2xs leading-snug text-muted">
									{x.note}
								</span>
							</label>
						);
					})}
				</fieldset>
			</section>

			<Group>
				<Segmented<Mode>
					label="Mode"
					value={p.mode}
					options={[
						{ value: "system", label: "System" },
						{ value: "light", label: "Light" },
						{ value: "dark", label: "Dark" },
					]}
					onChange={(v, el) => withThemeReveal(() => setPrefs({ mode: v }), el)}
				/>
				<ToggleRow
					label="Pure black"
					description="True black behind dark mode. Saves battery on OLED screens."
					checked={p.amoled}
					onChange={(v) => setPrefs({ amoled: v })}
				/>
			</Group>

			<Group
				title="Glass"
				note="Clear lets more of the colour through. Solid turns the blur off, which also saves battery."
			>
				<Segmented<GlassLevel>
					label="Material"
					value={p.glass}
					options={[
						{ value: "clear", label: "Clear" },
						{ value: "frosted", label: "Frosted" },
						{ value: "solid", label: "Solid" },
					]}
					onChange={(v) => setPrefs({ glass: v })}
				/>
				<ToggleRow
					label="Glow"
					description="The soft theme colour behind the glass."
					checked={p.glow}
					onChange={(v) => setPrefs({ glow: v })}
				/>
			</Group>

			<Group>
				<Segmented<TextSize>
					label="Text size"
					value={p.textSize}
					options={[
						{ value: "standard", label: "Standard" },
						{ value: "large", label: "Large" },
						{ value: "larger", label: "Larger" },
					]}
					onChange={(v) => setPrefs({ textSize: v })}
				/>
				<ToggleRow
					label="Reduce motion"
					description="Fades instead of movement. Also follows your phone's setting."
					checked={p.reduceMotion}
					onChange={(v) => setPrefs({ reduceMotion: v })}
				/>
			</Group>
		</Screen>
	);
}
