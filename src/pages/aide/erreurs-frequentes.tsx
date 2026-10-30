import styled from "@emotion/styled"
import HelpPage from "src/components/HelpPage"
import { CONTACT_EMAIL } from "src/constants"

const Message = styled.h3`
  font-size: 1em;
  margin: 24px 0 4px;
`

interface ErrorItem {
  message: string
  answer: React.ReactNode
}

const Contact = () => <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>

// Messages repris de l'inscription (api/user), des créneaux (Slots, Reservation) et de l'annonce
const ACCOUNT_ERRORS: ErrorItem[] = [
  {
    message: "« Numéro de SIRET introuvable »",
    answer: "Vérifiez les 14 chiffres de votre SIRET (les espaces sont acceptés).",
  },
  {
    message: "« Ce numéro de SIRET n'existe pas ou plus, ou ses données ne sont pas consultables »",
    answer: (
      <>
        Votre fiche à l&apos;INSEE n&apos;est sans doute pas publique. Écrivez-nous à <Contact /> pour que nous
        vérifiions votre situation.
      </>
    ),
  },
  {
    message: "« Le compte de cet établissement est déjà créé »",
    answer: "Un compte existe déjà pour ce SIRET : connectez-vous, ou utilisez « Mot de passe oublié ? ».",
  },
  {
    message: "« Désolé, l'activité principale de votre société ne vous permet pas de publier des annonces »",
    answer: (
      <>
        Seuls les producteurs et artisans de l&apos;alimentaire peuvent publier. Si vous pensez qu&apos;il s&apos;agit
        d&apos;une erreur, écrivez-nous à <Contact />.
      </>
    ),
  },
  {
    message: "« Cette adresse e-mail est déjà utilisée »",
    answer: "Un compte existe déjà avec cette adresse : connectez-vous, ou utilisez « Mot de passe oublié ? ».",
  },
]

const PRODUCT_ERRORS: ErrorItem[] = [
  {
    message: "« Veuillez sélectionner l'adresse dans la liste déroulante »",
    answer: "Tapez l'adresse, puis cliquez sur l'une des propositions de la liste qui s'affiche.",
  },
  {
    message: "« Vous devez au moins spécifier une adresse e-mail ou un numéro de téléphone »",
    answer: "Renseignez au moins un moyen de vous contacter.",
  },
  {
    message: "« L'unité est obligatoire pour activer une réservation. »",
    answer: "Choisissez l'unité du produit (g, kg, litre(s), pièce(s)) à côté de la quantité.",
  },
  {
    message: "« La date doit être après la date actuelle. » / « L'heure de début doit être après l'heure actuelle. »",
    answer: "Un créneau ne peut pas commencer dans le passé : choisissez une date ou une heure à venir.",
  },
  {
    message: "« L'heure de début doit être avant l'heure de fin. »",
    answer: "Vérifiez les heures du créneau.",
  },
  {
    message: "« Ce créneau existe déjà. »",
    answer: "Un créneau identique (même date et mêmes heures) est déjà dans l'annonce.",
  },
  {
    message: "« Indiquez un stock supérieur à 0. » / « La quantité maximale par personne dépasse le stock. »",
    answer: "Corrigez le stock ou la quantité maximale dans la réservation du créneau.",
  },
  {
    message: "« Un créneau contient une réservation incomplète : corrigez-la avant d'enregistrer. »",
    answer:
      "Un des créneaux a une réservation mal remplie : complétez son stock, ou cliquez sur « Annuler la réservation ».",
  },
  {
    message: "Mon annonce n'apparaît pas sur le site",
    answer:
      "Attendez quelques minutes après l'enregistrement, et vérifiez dans « Mes annonces » que la durée de publication n'est pas à 0 jour.",
  },
]

const ErrorList = ({ items }: { items: ErrorItem[] }) => (
  <>
    {items.map((item) => (
      <div key={item.message}>
        <Message>{item.message}</Message>
        <p>{item.answer}</p>
      </div>
    ))}
  </>
)

const ErrorsHelpPage = () => (
  <HelpPage title="Les erreurs les plus fréquentes">
    <h2>À l&apos;inscription</h2>
    <ErrorList items={ACCOUNT_ERRORS} />
    <h2>Dans une annonce et ses créneaux</h2>
    <ErrorList items={PRODUCT_ERRORS} />
  </HelpPage>
)

export default ErrorsHelpPage
