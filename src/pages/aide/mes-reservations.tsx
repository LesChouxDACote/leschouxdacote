import HelpPage, { Ui } from "src/components/HelpPage"

const MyBookingsHelpPage = () => (
  <HelpPage title="Gérer ses réservations">
    <p>
      Dans le menu, <Ui>Mes réservations</Ui> rassemble toutes vos réservations. Pour chacune, vous voyez le produit, le
      créneau, l&apos;adresse du retrait, les coordonnées du producteur et le total à payer.
    </p>

    <h2>Changer la quantité</h2>
    <p>
      Saisissez la nouvelle quantité, puis cliquez sur <Ui>Modifier</Ui>. Le producteur est prévenu de la modification.
      Le nombre de quantités encore disponibles sur le créneau est indiqué juste en dessous.
    </p>

    <h2>Annuler une réservation</h2>
    <p>
      Cliquez sur <Ui>Annuler</Ui>, puis sur <Ui>Confirmer l’annulation</Ui>.
    </p>

    <h2>Réservations passées</h2>
    <p>
      Les réservations dont le créneau est passé, ou dont l&apos;annonce n&apos;est plus disponible, restent affichées
      en gris, sans possibilité de les modifier.
    </p>
  </HelpPage>
)

export default MyBookingsHelpPage
