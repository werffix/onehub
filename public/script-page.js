'use strict';
document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-copy="command"]');
  if (!button) return;
  const command = button.closest('.command-row').querySelector('code').textContent;
  try {
    await navigator.clipboard.writeText(command);
    const previous = button.textContent;
    button.textContent = 'Скопировано';
    setTimeout(() => { button.textContent = previous; }, 1400);
  } catch {
    const range = document.createRange();
    range.selectNodeContents(button.closest('.command-row').querySelector('code'));
    const selection = window.getSelection();
    selection.removeAllRanges(); selection.addRange(range);
  }
});
