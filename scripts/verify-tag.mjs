import { readFileSync } from "node:fs";

// Fails the release when the pushed tag does not match package.json's version.
const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const tag = process.env.GITHUB_REF_NAME ?? "";

if (tag !== `v${version}`) {
    console.error(`Tag ${tag} does not match package version ${version}`);
    process.exit(1);
}
