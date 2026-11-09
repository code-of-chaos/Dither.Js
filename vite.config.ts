import { defineConfig } from "vitest/config";

export default defineConfig({
    build: {
        lib: {
            entry: {
                index: "src/index.ts",
                react: "src/react.tsx",
            },
            formats: ["es"],
            fileName: (_format, entryName) => `${entryName}.js`,
            cssFileName: "style",
        },
        rollupOptions: {
            external: ["react", "react/jsx-runtime"],
            output: {
                banner: (chunk) =>
                    chunk.fileName === "react.js" ? '"use client";' : "",
            },
        },
        sourcemap: true,
    },
    test: {
        environment: "happy-dom",
        include: ["src/**/*.test.{ts,tsx}"],
        setupFiles: ["./vitest.setup.ts"],
    },
});
