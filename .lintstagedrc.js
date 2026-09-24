export default {
  // Type check TypeScript files
  '**/*.(ts|tsx)': () => 'yarn ts-check',

  // Lint & Prettify TS and JS files
  '**/*.(ts|tsx|js)': () => ['yarn lint:fix', 'yarn format:fix'],

  // Prettify only Markdown and JSON files
  '**/*.(md|json|yml|yaml)': () => 'yarn format:fix'
};
