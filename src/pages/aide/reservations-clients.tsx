import HelpPage, { Ui } from "src/components/HelpPage"

const CustomerBookingsHelpPage = () => (
  <HelpPage title="Suivre les réservations de ses clients">
    <p>
      Ouvrez votre annonce depuis <Ui>Mes annonces</Ui>. Dans la partie <Ui>Créneaux</Ui>, sous chaque créneau réservé,
      cliquez sur <Ui>Voir les réservations</Ui>.
    </p>
    <ul>
      <li>Pour chaque client : son nom, son téléphone, son e-mail, la date de réservation et la quantité.</li>
      <li>En bas : le total réservé par rapport au stock du créneau.</li>
    </ul>

    <h2>Corriger une quantité</h2>
    <p>
      Sur un créneau à venir, changez la quantité d&apos;un client, puis cliquez sur <Ui>Enregistrer</Ui>. Pensez à
      prévenir ce client de la modification.
    </p>

    <h2>Créneaux passés ou retirés</h2>
    <p>
      Les créneaux passés sont regroupés sous <Ui>Créneaux passés</Ui>. Les réservations d&apos;un créneau retiré de
      l&apos;annonce restent affichées à part, pour que vous puissiez contacter les clients.
    </p>
  </HelpPage>
)

export default CustomerBookingsHelpPage
