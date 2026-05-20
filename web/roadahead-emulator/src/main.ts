import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("Root #app element not found");
}
