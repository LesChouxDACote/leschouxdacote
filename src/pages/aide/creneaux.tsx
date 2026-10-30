import HelpPage, { Ui } from "src/components/HelpPage"
import Link from "src/components/Link"
import { getHelpHref } from "src/constants/aide"

const SlotsHelpPage = () => (
  <HelpPage title="Créer des créneaux de retrait">
    <p>
      Les créneaux indiquent à vos clients quand venir chercher leurs produits. Avec une réservation, ils peuvent aussi
      réserver une quantité à l&apos;avance.
    </p>

    <h2>Ajouter un créneau</h2>
    <ol>
      <li>
        Dans votre annonce, partie <Ui>Créneaux</Ui>, cliquez sur <Ui>Ajouter un créneau</Ui>.
      </li>
      <li>Renseignez la date, l&apos;heure de début et l&apos;heure de fin.</li>
      <li>
        Cliquez sur <Ui>Ajouter</Ui>.
      </li>
    </ol>

    <h2>Ouvrir les réservations sur un créneau</h2>
    <p>
      Sur le créneau, cliquez sur <Ui>Configurer la réservation</Ui>, puis indiquez :
    </p>
    <ul>
      <li>
        le <Ui>Stock disponible</Ui> : quand il est atteint, plus personne ne peut réserver ce créneau ;
      </li>
      <li>
        une <Ui>Quantité maximale par personne</Ui> (facultative : laissez vide pour ne pas fixer de limite) ;
      </li>
      <li>
        des <Ui>Informations et consignes pour les clients</Ui> (lieu exact, sac à apporter…).
      </li>
    </ul>
    <p>L&apos;unité du produit doit être renseignée dans l&apos;annonce pour activer une réservation.</p>

    <h2>⚠️ Enregistrer</h2>
    <p>
      Cliquez ensuite sur <Ui>Enregistrer l&apos;annonce</Ui> : sans cela, vos créneaux ne sont pas gardés.
    </p>

    <h2>Supprimer un créneau</h2>
    <p>
      Si des clients ont déjà réservé ce créneau, l&apos;application vous prévient avant la suppression. Pensez à les
      contacter.
    </p>
    <p>
      Pour voir qui a réservé : <Link href={getHelpHref("reservations-clients")}>Suivre les réservations</Link>.
    </p>
  </HelpPage>
)

export default SlotsHelpPage
