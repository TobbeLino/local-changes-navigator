// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        ignores: ["out/**", "dist/**", "**/*.d.ts"]
    },
    {
        files: ["**/*.ts"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module"
        },
        rules: {
            "@typescript-eslint/naming-convention": [
                "warn",
                {
                    selector: "import",
                    format: ["camelCase", "PascalCase"]
                }
            ],
            "@typescript-eslint/no-explicit-any": "off",
            "prefer-const": "off",
            "curly": "warn",
            "eqeqeq": "warn",
            "no-throw-literal": "warn",
            "quotes": ["warn", "single", { "avoidEscape": true }]
        }
    }
);
