import {
	Airplane01Icon,
	ArrowDataTransferHorizontalIcon,
	Baby01Icon,
	BabyBottleIcon,
	BankIcon,
	BookOpen01Icon,
	Briefcase01Icon,
	Bus01Icon,
	Car01Icon,
	Cash01Icon,
	Coffee01Icon,
	Coins01Icon,
	CreditCardIcon,
	Dumbbell01Icon,
	Folder01Icon,
	FuelStationIcon,
	GameController01Icon,
	GiftIcon,
	GraduationScrollIcon,
	Home01Icon,
	Home09Icon,
	Hospital01Icon,
	Invoice03Icon,
	Medicine02Icon,
	Money03Icon,
	MoneyReceive01Icon,
	PaintRollerIcon,
	PartyIcon,
	PercentIcon,
	PiggyBankIcon,
	QrCode01Icon,
	Restaurant01Icon,
	Shirt01Icon,
	ShoppingBag01Icon,
	ShoppingBasket01Icon,
	SmartPhone01Icon,
	Tag01Icon,
	Wallet01Icon,
	WeddingIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import type {
	AccountKind,
	Category,
	CategoryIcon,
	ColorKey,
	GroupIcon,
} from "#/lib/model";
import { cn } from "#/lib/utils";

/** Hugeicons stroke-rounded, decorative by default. */
export function Icon({
	icon,
	size = 22,
	stroke = 1.6,
	className,
}: {
	icon: IconSvgElement;
	size?: number;
	stroke?: number;
	className?: string;
}) {
	return (
		<HugeiconsIcon
			icon={icon}
			size={size}
			strokeWidth={stroke}
			color="currentColor"
			className={cn("shrink-0", className)}
			aria-hidden
		/>
	);
}

/* ── Categories ───────────────────────────────────────────────── */

export const CATEGORY_ICON: Record<CategoryIcon, IconSvgElement> = {
	basket: ShoppingBasket01Icon,
	dining: Restaurant01Icon,
	coffee: Coffee01Icon,
	fuel: FuelStationIcon,
	transport: Bus01Icon,
	bills: Invoice03Icon,
	phone: SmartPhone01Icon,
	rent: Home09Icon,
	shopping: ShoppingBag01Icon,
	clothes: Shirt01Icon,
	travel: Airplane01Icon,
	health: Medicine02Icon,
	fitness: Dumbbell01Icon,
	education: BookOpen01Icon,
	entertainment: GameController01Icon,
	gift: GiftIcon,
	baby: BabyBottleIcon,
	emi: PercentIcon,
	salary: MoneyReceive01Icon,
	interest: PiggyBankIcon,
	refund: Coins01Icon,
	other: Tag01Icon,
};

/** A colour key as a CSS colour (set per mode in styles.css). */
export const colorVar = (key: ColorKey) => `var(--c-${key})`;
/** A category's chart colour. Unknown categories (deleted) read as slate. */
export const categoryColor = (c: Pick<Category, "color"> | undefined) =>
	colorVar(c?.color ?? "slate");

function Tile({
	color,
	icon,
	size,
	radius = "0.8rem",
}: {
	color: string;
	icon: IconSvgElement;
	size: number;
	radius?: string;
}) {
	return (
		<span
			aria-hidden
			className="grid shrink-0 place-items-center"
			style={{
				width: size,
				height: size,
				borderRadius: radius,
				color,
				background: `color-mix(in oklch, ${color} 16%, transparent)`,
			}}
		>
			<Icon icon={icon} size={Math.round(size * 0.5)} />
		</span>
	);
}

/** A category's icon in a soft tinted tile of its own colour. */
export function CategoryBadge({
	category,
	size = 40,
}: {
	category: Pick<Category, "icon" | "color"> | undefined;
	size?: number;
}) {
	return (
		<Tile
			color={categoryColor(category)}
			icon={CATEGORY_ICON[category?.icon ?? "other"]}
			size={size}
		/>
	);
}

/** A transfer between your own accounts. */
export function TransferBadge({ size = 40 }: { size?: number }) {
	return (
		<Tile
			color="var(--muted)"
			icon={ArrowDataTransferHorizontalIcon}
			size={size}
		/>
	);
}

/* ── Accounts ─────────────────────────────────────────────────── */

export const ACCOUNT_ICON: Record<AccountKind, IconSvgElement> = {
	cash: Cash01Icon,
	bank: BankIcon,
	upi: QrCode01Icon,
	card: CreditCardIcon,
	wallet: Wallet01Icon,
};
export const ACCOUNT_LABEL: Record<AccountKind, string> = {
	cash: "Cash",
	bank: "Bank account",
	upi: "UPI",
	card: "Credit card",
	wallet: "Wallet",
};
const ACCOUNT_COLOR: Record<AccountKind, ColorKey> = {
	cash: "green",
	bank: "blue",
	upi: "violet",
	card: "orange",
	wallet: "teal",
};
export const accountColor = (k: AccountKind) => colorVar(ACCOUNT_COLOR[k]);

export function AccountBadge({
	kind,
	size = 40,
}: {
	kind: AccountKind;
	size?: number;
}) {
	return (
		<Tile color={accountColor(kind)} icon={ACCOUNT_ICON[kind]} size={size} />
	);
}

/* ── Groups ───────────────────────────────────────────────────── */

export const GROUP_ICON: Record<GroupIcon, IconSvgElement> = {
	wedding: WeddingIcon,
	renovation: PaintRollerIcon,
	home: Home01Icon,
	travel: Airplane01Icon,
	party: PartyIcon,
	baby: Baby01Icon,
	study: GraduationScrollIcon,
	car: Car01Icon,
	health: Hospital01Icon,
	gift: GiftIcon,
	work: Briefcase01Icon,
	other: Folder01Icon,
};

export const GROUP_ICON_LABEL: Record<GroupIcon, string> = {
	wedding: "Wedding",
	renovation: "Renovation",
	home: "Home",
	travel: "Travel",
	party: "Party",
	baby: "Baby",
	study: "Study",
	car: "Car",
	health: "Health",
	gift: "Gift",
	work: "Work",
	other: "Other",
};

/* Each group icon borrows a chart colour, so groups read apart from each other. */
const GROUP_HUE: Record<GroupIcon, ColorKey> = {
	wedding: "pink",
	renovation: "amber",
	home: "slate",
	travel: "teal",
	party: "orange",
	baby: "blue",
	study: "violet",
	car: "blue",
	health: "green",
	gift: "pink",
	work: "slate",
	other: "violet",
};
export const groupColor = (icon: GroupIcon) => colorVar(GROUP_HUE[icon]);

/** A group's icon in a tinted tile of its colour. */
export function GroupBadge({
	icon,
	size = 44,
}: {
	icon: GroupIcon;
	size?: number;
}) {
	return (
		<Tile
			color={groupColor(icon)}
			icon={GROUP_ICON[icon]}
			size={size}
			radius="0.9rem"
		/>
	);
}

/** Used where money comes in. */
export const IncomeIcon = Money03Icon;
