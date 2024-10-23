import { CONTACT_EMAIL } from "src/constants"

export const handleError = (error: Error) => {
  console.error(error)
  // TODO: report
  alert(
    `Une erreur est survenue. Vérifiez votre connexion ou réessayez plus tard.
Si le problème persiste, contactez-nous à cette adresse : ${CONTACT_EMAIL}

Message d'erreur technique : ${error.message}`,
  )
}
