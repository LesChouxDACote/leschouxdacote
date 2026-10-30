import HelpPage, { Ui } from "src/components/HelpPage"
import Link from "src/components/Link"
import { MAX_PUBLICATION_DAYS } from "src/constants"
import { getHelpHref } from "src/constants/aide"

const PublishHelpPage = () => (
  <HelpPage title="Publier une annonce">
    <p>
      Dans le menu, cliquez sur <Ui>Créer une annonce</Ui>, puis renseignez :
    </p>
    <ul>
      <li>un titre ;</li>
      <li>la quantité et l&apos;unité (g, kg, litre(s), pièce(s)) ;</li>
      <li>le prix total : le prix au kilo, au litre ou à la pièce est calculé automatiquement ;</li>
      <li>
        l&apos;adresse de la vente (ferme, magasin, marché…),{" "}
        <strong>à choisir dans la liste qui s&apos;affiche</strong> pendant la saisie ;
      </li>
      <li>une description, des mots-clés et une photo ;</li>
      <li>une adresse e-mail ou un téléphone (au moins l&apos;un des deux).</li>
    </ul>
    <p>
      Choisissez enfin une durée de publication, de 1 à {MAX_PUBLICATION_DAYS} jours, puis cliquez sur{" "}
      <Ui>Enregistrer l&apos;annonce</Ui>. Avec une durée de 0 jour, l&apos;annonce est enregistrée mais pas publiée.
    </p>
    <p>L&apos;annonce apparaît en ligne quelques minutes après l&apos;enregistrement.</p>
    <p>
      Pour proposer des retraits sur réservation, ajoutez des créneaux dans la même page : voir{" "}
      <Link href={getHelpHref("creneaux")}>Créer des créneaux de retrait</Link>.
    </p>

    <h2>Conseils pour une bonne annonce</h2>
    <ul>
      <li>Une photo nette et lumineuse de votre produit.</li>
      <li>Un titre précis : « Pommes Reinette bio – 1 kg » plutôt que « Pommes ».</li>
      <li>Dans la description : la variété, le mode de culture ou d&apos;élevage, et les modalités de retrait.</li>
      <li>Des mots-clés que vos clients taperaient pour vous trouver (« légumes », « fromage de chèvre »…).</li>
    </ul>
  </HelpPage>
)

export default PublishHelpPage
