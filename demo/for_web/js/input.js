class InputHandler {
  constructor() {
    this.keys = new Set();
    this.justPressed = new Set();
    this.virtualHandlers = null;
    this._bindKeyboard();
  }

  _bindKeyboard() {
    document.addEventListener("keydown", (event) => {
      const key = event.code;
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
        event.preventDefault();
      }

      if (!this.keys.has(key)) {
        this.justPressed.add(key);
      }

      this.keys.add(key);
    });

    document.addEventListener("keyup", (event) => {
      this.keys.delete(event.code);
      this.justPressed.delete(event.code);
    });
  }

  isPressed(code) {
    return this.keys.has(code);
  }

  consumeJustPressed(code) {
    const pressed = this.justPressed.has(code);
    this.justPressed.delete(code);
    return pressed;
  }

  clearTransientState() {
    this.justPressed.clear();
  }

  bindVirtualButtons(handlers) {
    this.virtualHandlers = handlers;
    const mapping = [
      ["btn-jump", handlers.jump],
      ["btn-shoot", handlers.shoot],
      ["btn-missile", handlers.missile],
    ];

    for (const [id, callback] of mapping) {
      const button = document.getElementById(id);
      if (!button || !callback) {
        continue;
      }

      const invoke = (event) => {
        event.preventDefault();
        callback();
      };

      button.addEventListener("pointerdown", invoke);
      button.addEventListener("touchstart", invoke, { passive: false });
      button.addEventListener("mousedown", invoke);
    }
  }
}

const input = new InputHandler();
