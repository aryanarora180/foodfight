// Shared between the test runner (test/run.mjs) and the test files
// themselves, so both agree on where the isolated test server lives and
// which scratch data file it's reading/writing — kept completely separate
// from a developer's own .data/state.json.
export const PORT = 3100;
export const BASE_URL = `http://localhost:${PORT}`;
export const DATA_FILE_REL = ".data/test-state.json";
export const SESSION_SECRET =
  "food-fight-behavior-test-suite-session-secret-not-for-real-use";
