import HelpPage, { Ui } from "src/components/HelpPage"

const MyBookingsHelpPage = () => (
  <HelpPage title="Gérer ses réservations">
    <p>
      Dans le menu, <Ui>Mes réservations</Ui> rassemble toutes vos réservations, rangées en deux parties :{" "}
      <Ui>À venir</Ui>, du créneau le plus proche au plus lointain, puis <Ui>Passées</Ui>.
    </p>
    <p>
      En haut de chaque réservation, le créneau s&apos;affiche en gros (par exemple « Samedi 8 novembre · 9h – 12h »),
      avec le repère <Ui>Aujourd’hui</Ui> ou <Ui>Demain</Ui> quand c&apos;est le cas. En dessous, vous trouvez le
      produit, les coordonnées du producteur, ses consignes, l&apos;adresse du retrait (cliquez dessus pour ouvrir la
      carte), le prix et le total à payer.
    </p>

    <h2>Changer la quantité</h2>
    <p>
      Saisissez la nouvelle quantité, puis cliquez sur <Ui>Modifier</Ui>. Le producteur est prévenu de la modification.
      Juste en dessous, vous voyez ce qu&apos;il reste sur le créneau, par exemple « Encore 12 kg disponibles ».
    </p>

    <h2>Annuler une réservation</h2>
    <p>
      Cliquez sur <Ui>Annuler</Ui>, puis sur <Ui>Confirmer l’annulation</Ui>.
    </p>

    <h2>Annonce plus disponible</h2>
    <p>
      Si le producteur a supprimé l&apos;annonce ou retiré le créneau, la réservation reste dans <Ui>À venir</Ui> avec
      le message « Annonce plus disponible, contactez le producteur ». Elle ne peut plus être modifiée, mais vous pouvez
      toujours l&apos;annuler.
    </p>

    <h2>Réservations passées</h2>
    <p>
      Les réservations dont le créneau est passé restent affichées en gris sous <Ui>Passées</Ui>, sans possibilité de
      les modifier.
    </p>
  </HelpPage>
)

export default MyBookingsHelpPage
