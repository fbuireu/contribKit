import { ClassName, ElementId } from "../src/ui/utils/dom-contract";

export const ExportSelector = {
	CodePreview: `#${ElementId.ExportPreview} .${ClassName.CodePreview}`,
	CopyButton: `#${ElementId.ExportPreview} .${ClassName.CopyButton}`,
	PngPreview: `#${ElementId.ExportPreview} .${ClassName.PngPreview}`,
} as const;
