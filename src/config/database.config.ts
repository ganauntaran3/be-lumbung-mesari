import { registerAs } from '@nestjs/config'
import knexConfig from '../../knexfile'

export default registerAs('database', () => {
  const env = process.env.NODE_ENV || 'development'
  const config = knexConfig[env]

  if (!config) {
    throw new Error(
      `Database configuration for environment "${env}" is not defined`
    )
  }

  return config
})
