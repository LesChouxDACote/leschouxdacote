import styled from "@emotion/styled"
import HelpPage, { Ui } from "src/components/HelpPage"
import Link from "src/components/Link"
import { getHelpHref } from "src/constants/aide"

const Question = styled.h2`
  font-size: 1.2em;
  margin-top: 32px;
`

const FaqPage = () => (
  <HelpPage title="Foire aux questions">
    <Question>Quelles différences avec des sites marchands comme La Fourche ou La Ruche qui dit Oui ! ?</Question>
    <p>
      Les Choux d&apos;à Côté est une plateforme d&apos;annonces alimentaires qui défend le circuit court sans imposer
      de mode de vente ni de paiement. Producteurs et acheteurs échangent directement, par e-mail, par téléphone ou sur
      place. Le règlement se fait en dehors de la plateforme, et chaque producteur reste libre de son mode de
      distribution : vente à la ferme, marché, AMAP, tournée…
    </p>

    <Question>Comment fonctionne la plateforme ?</Question>
    <p>
      Des producteurs professionnels publient des annonces. Les acheteurs les trouvent par mot-clé et par lieu, sur une
      liste ou une carte, puis les contactent ou réservent un créneau de retrait quand le producteur en propose.
    </p>

    <Question>Comment se passe la livraison ?</Question>
    <p>
      Le producteur et l&apos;acheteur choisissent ensemble : retrait à la ferme, tournée, point relais, drive fermier,
      achat groupé… Les Choux d&apos;à Côté ne joue pas le rôle d&apos;intermédiaire.
    </p>

    <Question>Comment Les Choux d&apos;à Côté se rémunère ?</Question>
    <p>
      La consultation est gratuite. Les éventuelles conditions de publication sont précisées dans les{" "}
      <Link href="/cgu">CGU</Link>.
    </p>

    <Question>Qui peut publier des annonces ?</Question>
    <p>
      Seuls les producteurs et artisans professionnels de l&apos;alimentaire, après vérification de leur SIRET et de
      leur activité. Les particuliers ne peuvent pas publier, pour éviter une concurrence déloyale envers ceux qui
      paient des charges professionnelles.
    </p>

    <Question>Qui peut répondre aux annonces ?</Question>
    <p>Tout le monde : particuliers comme professionnels (restaurants, épiceries, boucheries…).</p>

    <Question>Est-il possible d&apos;acheter en ligne ?</Question>
    <p>
      Vous pouvez réserver en ligne quand le producteur propose des créneaux de retrait, mais le paiement se fait sur
      place, directement avec lui (espèces, chèque, virement… selon ce qu&apos;il accepte). Voir{" "}
      <Link href={getHelpHref("reserver")}>Réserver un produit</Link>.
    </p>

    <Question>Comment annuler une réservation ?</Question>
    <p>
      Dans le menu, ouvrez <Ui>Mes réservations</Ui>, cliquez sur <Ui>Annuler</Ui> sur la réservation concernée, puis
      sur <Ui>Confirmer l’annulation</Ui>.
    </p>

    <Question>Comment supprimer mon compte ?</Question>
    <p>
      Dans le menu, ouvrez <Ui>Mon profil</Ui> et cliquez sur <Ui>Supprimer le compte</Ui> en bas de la page. Pour un
      producteur, toutes ses annonces sont supprimées avec le compte.
    </p>
  </HelpPage>
)

export default FaqPage
