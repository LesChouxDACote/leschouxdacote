import { IncomingForm, type File } from "formidable"
import type { NextApiRequest } from "next"

// formidable v3 : les fichiers sont des tableaux par champ
type SingleFiles = Record<string, File[]>

export const getFormData = <T = any>(req: NextApiRequest): Promise<[T, SingleFiles]> =>
  new Promise((resolve, reject) => {
    const form = new IncomingForm()
    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(err)
      }
      resolve([fields as unknown as T, files as unknown as SingleFiles])
    })
  })
