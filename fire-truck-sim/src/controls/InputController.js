/**
 * 键盘输入：映射到与面板按钮相同的 hold / action 语义。
 */
export class InputController {
  constructor(actions) {
    this.actions = actions;
    this.keys = new Set();

    const down = (e) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', ' ', 'l', 'f', 'r', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        e.preventDefault();
      }
      if (this.keys.has(k)) return;
      this.keys.add(k);
      this._route(k, true);
    };
    const up = (e) => {
      const k = e.key.toLowerCase();
      this.keys.delete(k);
      this._route(k, false);
    };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', () => {
      // 窗口失焦时释放所有按住的键，避免“卡键”
      for (const k of this.keys) this._route(k, false);
      this.keys.clear();
    });
  }

  _route(k, pressed) {
    const hold = (key) => this.actions.hold?.(key, pressed);
    switch (k) {
      case 'w': case 'arrowup': hold('forward'); break;
      case 's': case 'arrowdown': hold('backward'); break;
      case 'a': case 'arrowleft': hold('left'); break;
      case 'd': case 'arrowright': hold('right'); break;
      case 'l': if (pressed) this.actions.action?.('beacon'); break;
      case 'f': if (pressed) this.actions.action?.('water'); break;
      case 'r': if (pressed) this.actions.action?.('reset-truck'); break;
      case ' ': if (pressed) this.actions.action?.('brake'); break;
      default: break;
    }
  }
}
