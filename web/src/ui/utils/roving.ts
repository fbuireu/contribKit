import { ClassName, ElementId } from "@ui/utils/dom-contract";
export const RovingOrientation = {
	Horizontal: "horizontal",
	Both: "both",
} as const;

export type RovingOrientation = (typeof RovingOrientation)[keyof typeof RovingOrientation];

interface SetRovingFocusParams {
	elements: NodeListOf<HTMLElement>;
	target: HTMLElement;
}

const setRovingFocus = ({ elements, target }: SetRovingFocusParams): void => {
	elements.forEach((element) => {
		element.tabIndex = element === target ? 0 : -1;
	});
};

export interface ActivateRadioParams {
	buttons: NodeListOf<HTMLElement>;
	target: HTMLElement;
}

export function activateRadio({ buttons, target }: ActivateRadioParams): void {
	buttons.forEach((button) => {
		button.classList.remove(ClassName.Active);
		button.setAttribute("aria-checked", "false");
	});
	target.classList.add(ClassName.Active);
	target.setAttribute("aria-checked", "true");
	setRovingFocus({ elements: buttons, target });
}

export interface ActivateTabParams {
	tabs: NodeListOf<HTMLElement>;
	target: HTMLElement;
}

export function activateTab({ tabs, target }: ActivateTabParams): void {
	tabs.forEach((tab) => {
		tab.classList.remove(ClassName.Active);
		tab.setAttribute("aria-selected", "false");
	});
	target.classList.add(ClassName.Active);
	target.setAttribute("aria-selected", "true");
	setRovingFocus({ elements: tabs, target });
	const panel = document.getElementById(ElementId.ExportPreview);
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
	const active = [...elements].find((element) => element.classList.contains(ClassName.Active)) ?? elements[0];
	if (active) setRovingFocus({ elements, target: active });
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
