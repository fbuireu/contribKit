type Token = [string, string];
type CodeLine = Token[];

export const SVG_LINES: CodeLine[] = [
  [['c-comment', '<!-- 53 × 7 grid · cell=10 · gap=2 -->']],
  [['c-tag', '<svg '], ['c-attr', 'viewBox'], ['', '='], ['c-str', '"0 0 636 84"'], ['', ' '], ['c-attr', 'xmlns'], ['', '='], ['c-str', '"http://www.w3.org/2000/svg"'], ['c-tag', '>']],
  [['', ' '], ['c-tag', '<rect '], ['c-attr', 'x'], ['', '='], ['c-str', '"0"'], ['', ' '], ['c-attr', 'y'], ['', '='], ['c-str', '"0"'], ['', ' '], ['c-attr', 'width'], ['', '='], ['c-str', '"10"'], ['', ' '], ['c-attr', 'height'], ['', '='], ['c-str', '"10"'], ['', ' '], ['c-attr', 'rx'], ['', '='], ['c-str', '"2"'], ['', ' '], ['c-attr', 'fill'], ['', '='], ['c-str', '"#0E4429"'], ['c-tag', '/>']],
  [['', ' '], ['c-tag', '<rect '], ['c-attr', 'x'], ['', '='], ['c-str', '"12"'], ['', ' '], ['c-attr', 'y'], ['', '='], ['c-str', '"0"'], ['', ' '], ['c-attr', 'width'], ['', '='], ['c-str', '"10"'], ['', ' '], ['c-attr', 'height'], ['', '='], ['c-str', '"10"'], ['', ' '], ['c-attr', 'rx'], ['', '='], ['c-str', '"2"'], ['', ' '], ['c-attr', 'fill'], ['', '='], ['c-str', '"#26A641"'], ['c-tag', '/>']],
  [['', ' '], ['c-tag', '<rect '], ['c-attr', 'x'], ['', '='], ['c-str', '"24"'], ['', ' '], ['c-attr', 'y'], ['', '='], ['c-str', '"0"'], ['', ' '], ['c-attr', 'width'], ['', '='], ['c-str', '"10"'], ['', ' '], ['c-attr', 'height'], ['', '='], ['c-str', '"10"'], ['', ' '], ['c-attr', 'rx'], ['', '='], ['c-str', '"2"'], ['', ' '], ['c-attr', 'fill'], ['', '='], ['c-str', '"#39D353"'], ['c-tag', '/>']],
  [['', ' '], ['c-comment', '<!-- … 368 more rects … -->']],
  [['c-tag', '</svg>']],
];

export const MD_LINES: CodeLine[] = [
  [['c-comment', '<!-- paste into your README -->']],
  [],
  [['c-tag', '!['], ['c-str', 'contributions'], ['c-tag', ']('], ['c-attr', 'https://contribkit.app/user/torvalds.svg'], ['c-tag', ')']],
  [],
  [['c-comment', '<!-- or with options -->']],
  [],
  [['c-tag', '!['], ['c-str', 'contributions'], ['c-tag', ']('], ['c-attr', 'https://contribkit.app/user/torvalds.svg']],
  [['', ' '], ['c-attr', '?palette'], ['', '='], ['c-str', 'monokai'], ['c-tag', '&']],
  [['', ' '], ['c-attr', '&shape'], ['', '='], ['c-str', 'hex'], ['c-tag', '&']],
  [['', ' '], ['c-attr', '&bg'], ['', '='], ['c-str', 'transparent'], ['c-tag', ')']],
];

export function buildCodeBlock(lines: CodeLine[]): HTMLPreElement {
  const pre = document.createElement('pre');
  pre.className = 'code';
  lines.forEach((line) => {
    const div = document.createElement('div');
    div.className = 'code-line';
    if (!line.length) {
      div.innerHTML = '&nbsp;';
    } else {
      line.forEach(([className, text]) => {
        const span = document.createElement('span');
        if (className) span.className = className;
        span.textContent = text;
        div.appendChild(span);
      });
    }
    pre.appendChild(div);
  });
  return pre;
}
