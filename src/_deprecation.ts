/**
 * One-shot console.warn helper for renamed SDK methods.
 *
 * Each old method name warns at most once per process. Calling
 * {@link _resetWarned} clears the internal set — only intended for tests.
 */

const warned = new Set<string>();

export function warnDeprecatedMethod(
  oldName: string,
  newName: string,
  removal = '1.0',
): void {
  if (warned.has(oldName)) {
    return;
  }
  warned.add(oldName);
  // eslint-disable-next-line no-console
  console.warn(
    `@foxnose/sdk: ${oldName}() is deprecated; use ${newName}() instead. ` +
      `${oldName}() will be removed in @foxnose/sdk ${removal}.`,
  );
}

/** Internal helper for tests — clears the warned set so tests stay independent. */
export function _resetWarned(): void {
  warned.clear();
}
