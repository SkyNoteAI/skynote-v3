export default {
  // TODO: Fix ESLint configuration issues in TASK-022
  '*.{ts,tsx}': ['prettier --write'], // Temporarily disabled ESLint
  '*.{js,jsx}': ['eslint --fix', 'prettier --write'],
  '*.{json,md,yml,yaml}': ['prettier --write'],
};