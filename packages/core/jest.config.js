/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleNameMapper: {
    '^@prehospital-epr/core$': '<rootDir>/../../packages/core/src/index.ts',
    '^@prehospital-epr/fhir$': '<rootDir>/../../packages/fhir/src/index.ts',
    '^@prehospital-epr/sync$': '<rootDir>/../../packages/sync/src/index.ts',
    '^@prehospital-epr/security$': '<rootDir>/../../packages/security/src/index.ts',
    '^@prehospital-epr/clinical$': '<rootDir>/../../packages/clinical/src/index.ts',
  },
};