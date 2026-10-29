import { stringify } from "csv-stringify"

// csv-stringify v6 : stringify est un named export, le callback reste l'API
const getCsv = (data: any[], columns: string[]): Promise<string> =>
  new Promise((resolve, reject) => {
    stringify(data, { columns, header: true }, (err, output) => {
      if (err) {
        reject(err)
      } else {
        resolve(output)
      }
    })
  })

export default getCsv
