import { IncomingForm, type File } from "formidable"
import type { NextApiRequest } from "next"

// formidable v3 : les fichiers sont des tableaux par champ
type SingleFiles = Record<string, File[]>

// formidable v3 : les champs aussi sont des tableaux ; aucun champ du formulaire annonce
// n'est multi-valué (_tags est un input hidden avec les valeurs jointes par des virgules),
// on reprend donc la forme scalaire attendue par les handlers
const unwrapFields = (fields: Record<string, string[] | undefined>) =>
  Object.fromEntries(Object.entries(fields).map(([key, values]) => [key, values?.[0]]))

export const getFormData = <T = any>(req: NextApiRequest): Promise<[T, SingleFiles]> =>
  new Promise((resolve, reject) => {
    const form = new IncomingForm()
    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(err)
      }
      resolve([unwrapFields(fields) as unknown as T, files as unknown as SingleFiles])
    })
  })
