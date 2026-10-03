// Descarga el esquema GraphQL de un Suwayomi en marcha y lo guarda en schema.graphql.
// Uso: SUWAYOMI_URL=http://127.0.0.1:4567 npm run schema
import { writeFileSync } from 'node:fs'
import { buildClientSchema, getIntrospectionQuery, printSchema } from 'graphql'

const base = (process.env.SUWAYOMI_URL ?? 'http://127.0.0.1:4567').replace(/\/$/, '')
const res = await fetch(`${base}/api/graphql`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ query: getIntrospectionQuery() })
})
if (!res.ok) throw new Error(`Suwayomi respondió ${res.status}`)
const { data, errors } = await res.json()
if (errors?.length) throw new Error(JSON.stringify(errors))
writeFileSync('schema.graphql', printSchema(buildClientSchema(data)) + '\n')
console.log(`schema.graphql actualizado desde ${base}`)
