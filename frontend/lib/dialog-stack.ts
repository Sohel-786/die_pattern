// Global stack to track open dialogs and handle nested ESC key behavior
const dialogStack: (() => void)[] = [];

function handleGlobalEsc(e: KeyboardEvent) {
  if (e.key !== "Escape") return;
  if (dialogStack.length === 0) return;
  e.preventDefault();
  e.stopPropagation();
  const close = dialogStack[dialogStack.length - 1];
  close();
}

// Single global Esc listener so Esc always closes the top dialog (avoids focus/iframe issues in Edit PO).
if (typeof window !== "undefined") {
  window.addEventListener("keydown", handleGlobalEsc, true);
}

/**
 * Registers a close function to the stack.
 * Returns a cleanup function to remove it.
 */
export function registerDialog(closeFn: () => void) {
  dialogStack.push(closeFn);

  return () => {
    const index = dialogStack.indexOf(closeFn);
    if (index > -1) {
      dialogStack.splice(index, 1);
    }
  };
}

/**
 * Checks if the given close function is at the top of the stack.
 */
export function isTopDialog(closeFn: () => void) {
  return dialogStack[dialogStack.length - 1] === closeFn;
}

/**
 * Gets the total number of open dialogs.
 */
export function getOpenDialogCount() {
  return dialogStack.length;
}
