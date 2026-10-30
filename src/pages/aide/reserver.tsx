import HelpPage, { Ui } from "src/components/HelpPage"
import Link from "src/components/Link"
import { getHelpHref } from "src/constants/aide"

const BookHelpPage = () => (
  <HelpPage title="Réserver un produit">
    <p>
      Quand un producteur propose des créneaux de retrait, un bouton <Ui>Réserver</Ui> apparaît sur son annonce.
    </p>
    <ol>
      <li>
        Cliquez sur <Ui>Réserver</Ui>. Si vous n&apos;êtes pas connecté, la page de connexion s&apos;ouvre d&apos;abord.
      </li>
      <li>
        Choisissez un créneau. Ceux marqués <Ui>(complet)</Ui> ne sont plus disponibles.
      </li>
      <li>Lisez les consignes du producteur, affichées sous les créneaux.</li>
      <li>Indiquez la quantité, votre téléphone et votre e-mail.</li>
      <li>
        Cliquez sur <Ui>Valider la réservation</Ui>.
      </li>
    </ol>
    <p>
      Vous avez une seule réservation par annonce : si vous réservez à nouveau, elle remplace la précédente. Le bouton
      devient alors <Ui>Modifier ma réservation</Ui>.
    </p>
    <p>
      Le paiement se fait directement avec le producteur, au moment du retrait (espèces, chèque, virement… selon ce
      qu&apos;il accepte).
    </p>
    <p>
      Pour retrouver, modifier ou annuler vos réservations, consultez{" "}
      <Link href={getHelpHref("mes-reservations")}>Gérer ses réservations</Link>.
    </p>
  </HelpPage>
)

export default BookHelpPage
