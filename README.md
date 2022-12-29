# cypress-codemod

A codemod for migrating React Testing Library or Enzyme tests to Cypress component tests!

## Usage

```bash
npx cypress-codemod --filePath path/to/my-test.tsx
```

```bash
npx cypress-codemod --directory path/to/directory-containing-tests/
```

## CLI Options

| Flag                      | Type   | Description                                                                                                                              |
| ------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `--filePath`, `-f`        | String | A path to a test file to migrate. If ommitted, `--directory` is required.                                                                |
| `--directory`, `-d`       | String | A directory containing test files to migrate (a recursive search is performed in this directory). If ommitted, `--filePath` is required. |
| `--customMountCommand`    | String | A custom command to use instead of cy.mount()                                                                                            |
| `--customDOMEmptyCommand` | String | A custom command to use for asserting the DOM is empty.                                                                                  |
