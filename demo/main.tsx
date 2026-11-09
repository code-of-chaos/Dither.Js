import { createRoot } from "react-dom/client";
import { DitherGridBackground } from "../src/index.ts";
import "./demo.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
    throw new Error("Root element #root not found");
}

createRoot(rootElement).render(
    <DitherGridBackground className="min-h-screen w-full">
        <main className="playground">
            <h1>
                <span className="accent">dither</span>.js
            </h1>
            <p>Animated bitmap-dithered gradient backgrounds.</p>
        </main>
    </DitherGridBackground>,
);
