import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { OTPInput, REGEXP_ONLY_DIGITS } from "input-otp";
import { type FormEvent, type ReactNode, useState } from "react";
import {
	sendCode,
	signInWithPassword,
	signUpWithPassword,
	syncEnabled,
	syncStore,
	verifyCode,
} from "#/lib/sync";
import { cn, haptic } from "#/lib/utils";
import { fieldClass } from "#/ui/Form";
import { Logo } from "#/ui/Logo";

export const Route = createFileRoute("/sign-in")({
	component: SignIn,
});

/** password: sign in (the default). signup: new account. link: email a link. sent: check email. */
type Step = "password" | "signup" | "link" | "sent" | "confirm";

/** Plain-language versions of the errors people actually hit. */
function explain(e: unknown) {
	const m = (e as Error)?.message ?? "";
	if (/expired|invalid.*(otp|token)|token.*(expired|invalid)/i.test(m))
		return "That code didn't work. Check it, or send a new one.";
	if (/invalid login credentials/i.test(m))
		return "That email and password don't match.";
	if (/email not confirmed/i.test(m))
		return "Confirm your email first: open the link we sent you.";
	if (/already registered|already exists/i.test(m))
		return "You already have an account. Sign in instead.";
	if (/password should be|weak password/i.test(m))
		return "Use at least 8 characters for your password.";
	if (/rate limit|too many|security purposes/i.test(m))
		return "Too many tries. Wait a minute, then try again.";
	if (/fetch|network/i.test(m) || !navigator.onLine)
		return "You're offline. Connect and try again.";
	return m || "Something went wrong. Try again.";
}

function SignIn() {
	const status = useStore(syncStore, (s) => s.status);
	const [step, setStep] = useState<Step>("password");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [code, setCode] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	if (!syncEnabled) {
		return (
			<Shell>
				<p className="text-lg font-semibold">Sync isn't set up yet</p>
				<p className="mt-1 text-sm text-muted">
					Everything you add stays on this phone. Signing in arrives once the
					app is connected to its database.
				</p>
				<Link
					to="/"
					className="btn-stamp pressable mt-5 grid h-13 place-items-center rounded-[var(--radius-row)] text-base font-semibold"
				>
					Back to Oryn
				</Link>
			</Shell>
		);
	}
	if (status !== "signed-out" && status !== "loading")
		return <Navigate to="/" replace />;

	const addr = email.trim();
	const validEmail = /^\S+@\S+\.\S+$/.test(addr);

	function go(next: Step) {
		setError(null);
		setCode("");
		setStep(next);
	}

	async function run(fn: () => Promise<unknown>) {
		setBusy(true);
		setError(null);
		try {
			const next = (await fn()) as Step | undefined;
			haptic("success");
			if (next) setStep(next);
		} catch (e) {
			haptic("error");
			setError(explain(e));
		} finally {
			setBusy(false);
		}
	}

	function submit(e: FormEvent) {
		e.preventDefault();
		if (busy || !validEmail) return;
		if (step === "password" && password)
			void run(async () => {
				await signInWithPassword(addr, password);
				return undefined;
			});
		if (step === "signup" && password.length >= 8)
			void run(async () =>
				(await signUpWithPassword(addr, password)) ? undefined : "confirm",
			);
		if (step === "link")
			void run(async () => {
				await sendCode(addr);
				return "sent";
			});
		if (step === "sent" && code.length === 6)
			void run(() => verifyCode(addr, code));
	}

	const emailField = (
		<Labelled label="Email">
			<input
				type="email"
				value={email}
				onChange={(e) => setEmail(e.target.value)}
				autoComplete="email"
				inputMode="email"
				enterKeyHint="next"
				className={fieldClass}
			/>
		</Labelled>
	);

	return (
		<Shell>
			<form onSubmit={submit} noValidate>
				{(step === "password" || step === "signup") && (
					<>
						<Heading
							title={
								step === "password" ? "Sign in to Oryn" : "Create your account"
							}
							note="Your expenses, saved to your account and on every phone you use."
						/>
						{emailField}
						<Labelled
							label="Password"
							hint={step === "signup" ? "At least 8 characters." : undefined}
						>
							<input
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								autoComplete={
									step === "password" ? "current-password" : "new-password"
								}
								enterKeyHint="go"
								className={fieldClass}
							/>
						</Labelled>
						<Submit
							disabled={
								!validEmail ||
								busy ||
								(step === "password" ? !password : password.length < 8)
							}
							busy={busy}
						>
							{step === "password" ? "Sign in" : "Create account"}
						</Submit>
						<p className="mt-3 text-center text-sm text-muted">
							{step === "password" ? "New to Oryn? " : "Have an account? "}
							<button
								type="button"
								onClick={() => go(step === "password" ? "signup" : "password")}
								className="font-medium text-stamp"
							>
								{step === "password" ? "Create an account" : "Sign in"}
							</button>
						</p>
						<button
							type="button"
							onClick={() => go("link")}
							className="mt-1 h-11 w-full text-sm font-medium text-muted"
						>
							Forgot it? Email me a sign-in link
						</button>
					</>
				)}

				{step === "link" && (
					<>
						<Heading
							title="Sign in by email"
							note="We'll email you a link that signs you straight in. No password needed."
						/>
						{emailField}
						<Submit disabled={!validEmail || busy} busy={busy}>
							Email me a link
						</Submit>
						<BackButton onClick={() => go("password")}>
							Use my password instead
						</BackButton>
					</>
				)}

				{step === "sent" && (
					<>
						<Heading title="Check your email" />
						<p className="mt-1 text-sm text-muted">
							We emailed a sign-in link to{" "}
							<span className="font-medium text-ink">{addr}</span>. Open it on
							this phone. If the email shows a 6-digit code, type it here
							instead.
						</p>
						<OTPInput
							maxLength={6}
							value={code}
							onChange={setCode}
							pattern={REGEXP_ONLY_DIGITS}
							autoComplete="one-time-code"
							inputMode="numeric"
							aria-label="6-digit code"
							onComplete={(v: string) => void run(() => verifyCode(addr, v))}
							containerClassName="mt-5 flex justify-between gap-2"
							render={({ slots }) => (
								<>
									{slots.map((slot, i) => (
										<div
											// biome-ignore lint/suspicious/noArrayIndexKey: fixed six slots
											key={i}
											className={cn(
												"num grid h-14 flex-1 place-items-center rounded-[var(--radius-row)] bg-well text-2xl font-light",
												slot.isActive &&
													"shadow-[inset_0_0_0_2px_var(--stamp)]",
											)}
										>
											{slot.char ?? (slot.hasFakeCaret ? <Caret /> : null)}
										</div>
									))}
								</>
							)}
						/>
						<Submit disabled={code.length !== 6 || busy} busy={busy}>
							Sign in
						</Submit>
						<div className="mt-2 flex justify-between">
							<button
								type="button"
								onClick={() => go("password")}
								className="h-11 text-sm font-medium text-muted"
							>
								Use my password
							</button>
							<button
								type="button"
								disabled={busy}
								onClick={() => {
									setCode("");
									void run(() => sendCode(addr));
								}}
								className="h-11 text-sm font-medium text-stamp"
							>
								Send a new link
							</button>
						</div>
					</>
				)}

				{step === "confirm" && (
					<>
						<Heading title="Confirm your email" />
						<p className="mt-1 text-sm text-muted">
							We sent a link to{" "}
							<span className="font-medium text-ink">{addr}</span>. Open it to
							confirm your account, then sign in with your password.
						</p>
						<Submit
							disabled={false}
							busy={false}
							onClick={() => go("password")}
						>
							I've confirmed it
						</Submit>
					</>
				)}

				<p
					role="alert"
					className="mt-3 min-h-5 text-center text-sm font-medium text-negative"
				>
					{error}
				</p>
			</form>
		</Shell>
	);
}

function Heading({ title, note }: { title: string; note?: string }) {
	return (
		<>
			<h1 className="text-2xl font-semibold tracking-[-0.02em]">{title}</h1>
			{note && <p className="mt-1 text-sm text-muted">{note}</p>}
		</>
	);
}

function Labelled({
	label,
	hint,
	children,
}: {
	label: string;
	hint?: string;
	children: ReactNode;
}) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: the control is passed in as children
		<label className="mt-4 block">
			<span className="mb-1.5 block text-sm font-medium text-muted">
				{label}
			</span>
			{children}
			{hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
		</label>
	);
}

function BackButton({
	onClick,
	children,
}: {
	onClick: () => void;
	children: ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="mt-2 h-11 w-full text-sm font-medium text-stamp"
		>
			{children}
		</button>
	);
}

function Shell({ children }: { children: ReactNode }) {
	return (
		<main className="relative grid min-h-dvh place-items-center px-4 py-[max(1.5rem,env(safe-area-inset-top))]">
			<div aria-hidden className="ambient" />
			<div className="w-full max-w-sm">
				<div className="mb-6 flex flex-col items-center gap-2">
					<Logo size={56} />
					<p className="text-sm font-semibold tracking-[0.02em]">Oryn</p>
				</div>
				<div className="glass liquid card px-5 pt-6 pb-4">{children}</div>
			</div>
		</main>
	);
}

function Submit({
	disabled,
	busy,
	onClick,
	children,
}: {
	disabled: boolean;
	busy: boolean;
	onClick?: () => void;
	children: ReactNode;
}) {
	return (
		<button
			type={onClick ? "button" : "submit"}
			onClick={onClick}
			disabled={disabled}
			aria-busy={busy || undefined}
			className="btn-stamp pressable mt-5 h-13 w-full rounded-[var(--radius-row)] py-3.5 text-base font-semibold disabled:opacity-45 disabled:shadow-none"
		>
			{busy ? "One moment" : children}
		</button>
	);
}

function Caret() {
	return <span aria-hidden className="h-7 w-px animate-pulse bg-ink" />;
}
