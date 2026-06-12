export const RovingOrientation = {
	Horizontal: "horizontal",
	Both: "both",
} as const;

export type RovingOrientation = (typeof RovingOrientation)[keyof typeof RovingOrientation];

export interface ActivateRadioParams {
	buttons: NodeListOf<HTMLElement>;
	target: HTMLElement;
}

export function activateRadio({ buttons, target }: ActivateRadioParams): void {
	buttons.forEach((button) => {
		button.classList.remove("active");
		button.setAttribute("aria-checked", "false");
	});
	target.classList.add("active");
	target.setAttribute("aria-checked", "true");
}

export interface ActivateTabParams {
	tabs: NodeListOf<HTMLElement>;
	target: HTMLElement;
}

export function activateTab({ tabs, target }: ActivateTabParams): void {
	tabs.forEach((tab) => {
		tab.classList.remove("active");
		tab.setAttribute("aria-selected", "false");
	});
	target.classList.add("active");
	target.setAttribute("aria-selected", "true");
	const panel = document.getElementById("export-preview");
	if (panel && target.id) panel.setAttribute("aria-labelledby", target.id);
}

interface NextRovingIndexParams {
	key: string;
	index: number;
	length: number;
	orientation: RovingOrientation;
}

const nextRovingIndex = ({ key, index, length, orientation }: NextRovingIndexParams): number => {
	const wrapsVertically = orientation === RovingOrientation.Both;
	if (key === "ArrowRight" || (wrapsVertically && key === "ArrowDown")) return (index + 1) % length;
	if (key === "ArrowLeft" || (wrapsVertically && key === "ArrowUp")) return (index - 1 + length) % length;
	if (key === "Home") return 0;
	if (key === "End") return length - 1;
	return -1;
};

export interface InitRovingGroupParams {
	elements: NodeListOf<HTMLElement>;
	activate: (target: HTMLElement) => void;
	onActivate: () => void;
	orientation?: RovingOrientation;
}

export function initRovingGroup({
	elements,
	activate,
	onActivate,
	orientation = RovingOrientation.Both,
}: InitRovingGroupParams): void {
	elements.forEach((element, index) => {
		element.addEventListener("click", () => {
			activate(element);
			onActivate();
		});
		element.addEventListener("keydown", (event) => {
			const targetIndex = nextRovingIndex({ key: event.key, index, length: elements.length, orientation });
			if (targetIndex < 0) return;
			event.preventDefault();
			activate(elements[targetIndex]);
			elements[targetIndex].focus();
			onActivate();
		});
	});
}
