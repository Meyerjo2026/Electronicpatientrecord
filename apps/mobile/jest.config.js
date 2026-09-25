/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleNameMapper: {
    // Resolve workspace packages to source so tests exercise the current code
    // rather than a possibly stale `dist`.
    '^@prehospital-epr/core$': '<rootDir>/../../packages/core/src/index.ts',
    '^@prehospital-epr/fhir$': '<rootDir>/../../packages/fhir/src/index.ts',
    '^@prehospital-epr/sync$': '<rootDir>/../../packages/sync/src/index.ts',
    '^@prehospital-epr/security$': '<rootDir>/../../packages/security/src/index.ts',
    '^@prehospital-epr/clinical$': '<rootDir>/../../packages/clinical/src/index.ts',
    '^@prehospital-epr/nemsis$': '<rootDir>/../../packages/nemsis/src/index.ts',
  },
};
