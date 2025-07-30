import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import app from '../src/server'
import bcrypt from 'bcryptjs'

// Mock database queries used in authRoutes
const user = { id: '1', name: 'Test', email: 'test@example.com', password_hash: 'hash' }
let sqlMock: any

vi.mock('../src/db', () => ({
  sql: (...args: any[]) => sqlMock(...args)
}))

vi.mock('bcryptjs', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as any),
    compare: vi.fn(() => Promise.resolve(true))
  }
})

beforeEach(() => {
  sqlMock = vi.fn(async (query: TemplateStringsArray, ...values: any[]) => {
    if (query[0].includes('SELECT id, name, email, password_hash FROM users')) {
      return [user]
    }
    return []
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('POST /api/auth/login', () => {
  it('sets httpOnly cookie on successful login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'secret' })
      .expect(200)

    expect(res.body.user.email).toBe(user.email)
    const cookie = res.headers['set-cookie']?.[0]
    expect(cookie).toBeDefined()
    expect(cookie).toMatch(/token=/)
  })
})
