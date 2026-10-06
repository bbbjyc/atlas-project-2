// 글자를 클립보드에 복사한다. 성공하면 true.
// navigator.clipboard 는 https(또는 localhost)에서만 되므로, 안 되면 눈에 안 보이는 입력칸을 이용한 옛 방식으로 한 번 더 해 본다
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 권한이 없거나 막혔으면 아래 방법으로
  }

  const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const box = document.createElement('textarea');
  try {
    box.value = text;
    box.setAttribute('readonly', '');
    box.setAttribute('aria-hidden', 'true');
    box.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px';   // 16px: iOS 가 확대하지 않게
    document.body.appendChild(box);
    box.focus({ preventScroll: true });
    box.select();
    box.setSelectionRange(0, text.length);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    box.remove();
    before?.focus({ preventScroll: true });   // 열려 있던 창의 포커스를 돌려준다
  }
}
