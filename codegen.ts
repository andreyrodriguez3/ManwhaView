import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  schema: 'schema.graphql',
  documents: 'src/renderer/src/api/documents/**/*.graphql',
  generates: {
    'src/renderer/src/api/gql/graphql.ts': {
      plugins: ['typescript-operations', 'typed-document-node'],
      config: {
        scalars: { LongString: 'string', Cursor: 'string', Duration: 'string', Upload: 'unknown' },
        useTypeImports: true,
        enumsAsTypes: true,
        skipTypename: true
      }
    }
  }
}
export default config
