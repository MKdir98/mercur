const { loadEnv } = require('@medusajs/utils')
loadEnv('test', process.cwd())

module.exports = {
  transform: {
    '^.+\\.[jt]s$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', decorators: true }
        }
      }
    ]
  },
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'ts', 'json'],
  modulePathIgnorePatterns: ['dist/']
}

if (process.env.TEST_TYPE === 'integration:http') {
  module.exports.testMatch = ['**/integration-tests/http/*.spec.[jt]s']
} else if (process.env.TEST_TYPE === 'integration:modules') {
  module.exports.testMatch = ['**/src/modules/*/__tests__/**/*.[jt]s']
} else if (process.env.TEST_TYPE === 'unit') {
  module.exports.testMatch = ['**/src/**/__tests__/**/*.unit.spec.[jt]s']
} else if (process.env.TEST_TYPE === 'integration:postex') {
  module.exports.testMatch = ['**/tests/postex/**/*.spec.[jt]s']
} else {
  // Default when TEST_TYPE is unset — used by VS Code Jest extension
  module.exports.testMatch = ['**/tests/**/*.spec.[jt]s']
}
