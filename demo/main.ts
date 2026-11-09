import { DitherBackground } from "../src/index";
import "./demo.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
    throw new Error("Root element #root not found");
}

new DitherBackground().mount(rootElement);

const main = document.createElement("main");
main.className = "playground";
main.innerHTML = `
    <h1><span class="accent">Dither</span>.Js</h1>
    <p>Animated bitmap-dithered gradient backgrounds.</p>
`;
rootElement.append(main);
