export class Toast {
  private container: HTMLDivElement;

  constructor() {
    // Create a container for the toasts
    this.container = document.createElement("div");
    this.container.style.position = "fixed";
    this.container.style.bottom = "20px";
    this.container.style.right = "20px";
    this.container.style.zIndex = "1000";
    this.container.style.display = "flex";
    this.container.style.fontFamily = "verdana";
    this.container.style.flexDirection = "column";
    this.container.style.gap = "10px";
    document.body.appendChild(this.container);
  }

  show(message: string, duration: number = 3000): void {
    const toast = document.createElement("div");
    toast.textContent = message;
    toast.style.padding = "10px 20px";
    toast.style.backgroundColor = "#333";
    toast.style.color = "#fff";
    toast.style.borderRadius = "5px";
    toast.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
    toast.style.opacity = "1";
    toast.style.transition = "opacity 0.5s ease";

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => {
        toast.remove();
      }, 500);
    }, duration);
  }
}
