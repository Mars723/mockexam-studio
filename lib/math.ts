/** Normalize common LaTeX delimiters, preserving inline and fenced code literally. */
export function normalizeMath(text: string) {
  return text
    .split(/(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)/g)
    .map((part, i) =>
      i % 2
        ? part
        : part
            .replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => `$${m}$`)
            .replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `\n$$\n${m.trim()}\n$$\n`)
            .replace(
              /\$\$([\s\S]*?)\$\$/g,
              (_, m) => `\n$$\n${m.trim()}\n$$\n`,
            ),
    )
    .join('');
}
