import globals from "globals";

export default [
    { ignores: ["node_modules/**", "dist/**", "tmp/**"] },
    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: { ...globals.es2022 },
        },
        rules: {
            "no-undef": "error",
            "no-unreachable": "error",
            "no-dupe-keys": "error",
            "valid-typeof": "error",
            "no-unsafe-finally": "error",
            curly: ["error", "all"],
            "one-var": ["error", "never"],
            "arrow-body-style": ["error", "always"],
            "padding-line-between-statements": [
                "error",
                { blankLine: "always", prev: "*", next: "function" },
                { blankLine: "always", prev: "function", next: "*" },
                { blankLine: "always", prev: "import", next: "*" },
                { blankLine: "any", prev: "import", next: "import" },
                {
                    blankLine: "always",
                    prev: ["const", "let", "var"],
                    next: "*",
                },
                {
                    blankLine: "any",
                    prev: ["const", "let", "var"],
                    next: ["const", "let", "var"],
                },
                { blankLine: "always", prev: "*", next: "return" },
                { blankLine: "always", prev: "block-like", next: "*" },
                { blankLine: "always", prev: "*", next: "export" },
            ],
            "no-restricted-syntax": [
                "error",
                {
                    selector: "ChainExpression",
                    message:
                        "Use explicit null checks instead of optional chaining.",
                },
            ],
        },
    },
    {
        files: ["src/**/*.js"],
        languageOptions: { globals: { ...globals.browser } },
    },
    {
        files: ["scripts/**/*.js", "eslint.config.js"],
        languageOptions: { globals: { ...globals.node } },
    },
    {
        files: ["tests/**/*.js"],
        languageOptions: { globals: { ...globals.node, ...globals.browser } },
    },
    {
        files: ["sw.js"],
        languageOptions: { globals: { ...globals.serviceworker } },
    },
];
