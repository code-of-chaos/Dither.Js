import { defineConfig } from "vitest/config";

export default defineConfig({
    build: {
        lib: {
            entry: "src/index.ts",
            formats: ["es"],
            fileName: "index",
            cssFileName: "style",
        },
        sourcemap: true,
    },
    test: {
        environment: "happy-dom",
        include: ["src/**/*.test.ts"],
    },
});
