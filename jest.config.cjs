/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "jsdom",
  roots: ["<rootDir>/client/src/__tests__/unit"],
  testMatch: ["**/*.spec.ts", "**/*.spec.tsx"],
  moduleNameMapper: {
    "^\\.\\/template-(style|markup|script)\\.js$": "<rootDir>/ui/template-$1.ts",
    "^\\.\\/template-script-part(\\d)\\.js$": "<rootDir>/ui/template-script-part$1.ts",
    "^\\.\\.\\/ui\\/template\\.js$": "<rootDir>/ui/template.ts"
  },
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.jest.json",
        diagnostics: false
      }
    ]
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  setupFiles: ["<rootDir>/client/src/__tests__/unit/setupTests.ts"]
};
