module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],

  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/redis.ts'
  ],

  moduleNameMapper: {
    '^@cr_docs_t/dts$': '<rootDir>/__mocks__/@cr_docs_t/dts.ts',
  },
};