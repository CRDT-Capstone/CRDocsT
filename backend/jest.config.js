module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Where to find your tests
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  
  // Setup file that runs before ALL test suites
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  
  // Coverage settings (optional)
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
  ],

  moduleNameMapper: {
    '^@cr_docs_t/dts$': '<rootDir>/__mocks__/@cr_docs_t/dts.ts',
  },
};