//  @ts-check

import { tanstackConfig } from "@tanstack/eslint-config";

export default [
  ...tanstackConfig,
  {
    ignores: ["*.js", "*.config.js", "**/node_modules/**"]
  },
  {
    rules: {
      "@typescript-eslint/no-unnecessary-condition": "off"
    }
  }
];
