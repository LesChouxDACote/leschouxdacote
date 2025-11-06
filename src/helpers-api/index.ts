import type { NextApiResponse } from "next"

export const respond = <T>(
  res: NextApiResponse<ApiResponse<T>>,
  errors?: Partial<Record<keyof T, string>>,
  code = 200,
) => {
  res.status(code).json(errors ? { errors } : { ok: true })
}

export const badRequest = (res: NextApiResponse<ApiResponse<any>>, code = 400) => {
  res.status(code).json({ ok: false })
}
