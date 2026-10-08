export async function enhanceCodeBlocks(root: HTMLElement, light: boolean) {
  const hljs = await import('highlight.js/lib/common');
  if (light) await import('highlight.js/styles/github.css');
  else await import('highlight.js/styles/github-dark.css');

  root.querySelectorAll<HTMLElement>('pre').forEach(pre => {
    const code = pre.querySelector<HTMLElement>('code');
    if (!code) return;
    hljs.default.highlightElement(code);

    let bar = pre.querySelector<HTMLElement>(':scope > .code-toolbar');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'code-toolbar';
      const label = document.createElement('span');
      const language = code.className.match(/language-([\w+#-]+)/)?.[1] || 'КОД';
      label.textContent = language.toUpperCase();
      const button = document.createElement('button');
      button.className = 'code-copy';
      button.type = 'button';
      button.textContent = 'Копировать';
      button.setAttribute('aria-label', 'Скопировать код');
      button.onclick = async () => {
        await navigator.clipboard.writeText(code.innerText);
        button.textContent = 'Скопировано';
        window.setTimeout(() => { button.textContent = 'Копировать'; }, 1500);
      };
      bar.append(label, button);
      pre.prepend(bar);
    }
  });
}
