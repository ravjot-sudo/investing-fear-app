import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import type { User } from '../../drizzle/schema'
import { sdk } from './sdk'

export type TrpcContext = {
  req: Request
  user: User | null
}

export async function createContext(
  opts: FetchCreateContextFnOptions
): Promise<TrpcContext> {
  let user: User | null = null

  try {
    // For fetch adapter, we need to convert Request to a format sdk understands
    // The SDK mainly uses headers for cookie parsing
    const req = opts.req as unknown as {
      headers: Headers
      cookies?: Record<string, string>
    }
    user = await sdk.authenticateRequest(req as any)
  } catch (error) {
    // Authentication is optional for public procedures
    user = null
  }

  return {
    req: opts.req,
    user,
  }
}