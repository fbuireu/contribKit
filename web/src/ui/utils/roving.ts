export function activateRadio(buttons: NodeListOf<HTMLElement>, target: HTMLElement): void {
	buttons.forEach((button) => {
		button.classList.remove("active");
		button.setAttribute("aria-checked", "false");
	});
	target.classList.add("active");
	target.setAttribute("aria-checked", "true");
}

export function addRadioKeyboard(buttons: NodeListOf<HTMLElement>, index: number, onActivate: () => void): void {
	buttons[index].addEventListener("keydown", (event) => {
		const len = buttons.length;
		let targetIndex = -1;
		if (event.key === "ArrowDown" || event.key === "ArrowRight") {
			event.preventDefault();
			targetIndex = (index + 1) % len;
		} else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
			event.preventDefault();
			targetIndex = (index - 1 + len) % len;
		} else if (event.key === "Home") {
			event.preventDefault();
			targetIndex = 0;
		} else if (event.key === "End") {
			event.preventDefault();
			targetIndex = len - 1;
		}
		if (targetIndex < 0) return;
		activateRadio(buttons, buttons[targetIndex]);
		buttons[targetIndex].focus();
		onActivate();
	});
}

export function activateTab(tabs: NodeListOf<HTMLElement>, target: HTMLElement): void {
	tabs.forEach((tab) => {
		tab.classList.remove("active");
		tab.setAttribute("aria-selected", "false");
	});
	target.classList.add("active");
	target.setAttribute("aria-selected", "true");
	const panel = document.getElementById("export-preview");
	if (panel && target.id) panel.setAttribute("aria-labelledby", target.id);
}
