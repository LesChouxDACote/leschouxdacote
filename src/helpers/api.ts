import { ValidationError } from "src/components/Form"
import { auth } from "src/helpers/firebase"
import HttpError from "standard-http-error"
import ERROR_CODES from "standard-http-error/codes"

export type Payload = Record<string, any>
export type Query = Record<string, string>

const queryString = (query: Query) =>
  Object.keys(query)
    .map((key) => `${key}=${encodeURIComponent(query[key])}`)
    .join("&")

const request = async <T>(method: string, path: string, params?: Payload | Query): Promise<T> => {
  const headers = new Headers()
  headers.set("Accept", "application/json")

  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken()
    headers.set("X-Token", token)
  }

  const init: RequestInit = {
    method,
  }

  if (params) {
    if (method === "GET") {
      path += "?" + queryString(params)
    } else {
      if (params instanceof FormData) {
        init.body = params
      } else {
        headers.set("Content-Type", "application/json")
        init.body = JSON.stringify(params)
      }
    }
  }

  init.headers = headers

  const response = await fetch("/api/" + path, init)

  const statusText: string = response.statusText || ERROR_CODES[response.status]

  if (response.status >= 400) {
    throw new HttpError(response.status, statusText)
  }

  const data = await response.json()

  if (method !== "GET" && data.errors) {
    const errors = data.errors as Record<string, string>
    Object.keys(errors).forEach((key) => {
      throw new ValidationError(key, errors[key])
    })
  }

  return data
}

export default {
  request,
  get: <T = unknown>(path: string, params?: Query) => request<T>("GET", path, params),
  post: <T = unknown>(path: string, params: Payload) => request<ApiResponse<T>>("POST", path, params),
  put: <T = unknown>(path: string, params: Payload) => request<ApiResponse<T>>("PUT", path, params),
  delete: <T = unknown>(path: string, params?: Payload) => request<ApiResponse<T>>("DELETE", path, params),
}
