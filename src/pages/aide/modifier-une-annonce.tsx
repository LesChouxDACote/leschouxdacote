import HelpPage, { Ui } from "src/components/HelpPage"
import { MAX_PUBLICATION_DAYS } from "src/constants"

const EditHelpPage = () => (
  <HelpPage title="Modifier ou republier une annonce">
    <h2>Modifier une annonce</h2>
    <ol>
      <li>
        Dans le menu, ouvrez <Ui>Mes annonces</Ui>.
      </li>
      <li>
        Cliquez sur <Ui>Modifier</Ui> sous l&apos;annonce.
      </li>
      <li>
        Faites vos changements, puis cliquez sur <Ui>Enregistrer l&apos;annonce</Ui>.
      </li>
    </ol>
    <p>
      Tant que vos changements ne sont pas enregistrés, le message <Ui>Modifications non enregistrées</Ui>{" "}
      s&apos;affiche en rouge. La modification est visible en ligne quelques minutes après l&apos;enregistrement.
    </p>

    <h2>Prolonger ou republier une annonce</h2>
    <ul>
      <li>
        Annonce en ligne : dans <Ui>Mes annonces</Ui>, cliquez sur <Ui>Ajouter des jours</Ui>.
      </li>
      <li>
        Annonce terminée ou désactivée : cliquez sur <Ui>Publier l’annonce</Ui> et choisissez une durée (jusqu&apos;à{" "}
        {MAX_PUBLICATION_DAYS} jours).
      </li>
    </ul>

    <h2>Désactiver ou supprimer une annonce</h2>
    <ul>
      <li>
        <Ui>Désactiver l’annonce</Ui> la retire du site ; vous pourrez la republier plus tard.
      </li>
      <li>
        La corbeille la supprime définitivement. Si des clients ont réservé un créneau à venir, vous en êtes averti
        avant de confirmer.
      </li>
    </ul>
  </HelpPage>
)

export default EditHelpPage
