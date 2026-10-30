import HelpPage, { Ui } from "src/components/HelpPage"
import Link from "src/components/Link"
import { getHelpHref } from "src/constants/aide"
import { MIN_PASSWORD_LENGTH } from "src/helpers/validators"

const CreateAccountHelpPage = () => (
  <HelpPage title="Créer son compte et se connecter">
    <h2>Créer son compte</h2>
    <ol>
      <li>
        Ouvrez la page <Link href="/inscription">Inscription</Link>.
      </li>
      <li>
        Choisissez <Ui>Je suis un producteur</Ui> ou <Ui>Je suis un acheteur</Ui>.
      </li>
      <li>
        Renseignez votre prénom, votre nom, votre e-mail et un mot de passe d&apos;au moins {MIN_PASSWORD_LENGTH}{" "}
        caractères.
      </li>
      <li>
        Producteurs : ajoutez aussi votre SIRET, votre nom commercial, votre adresse, une description de votre activité
        et votre téléphone.
      </li>
      <li>
        Cliquez sur <Ui>Valider</Ui> : vous arrivez sur la page de connexion.
      </li>
    </ol>
    <p>
      Seuls les producteurs et artisans de l&apos;alimentaire peuvent publier des annonces : leur SIRET et leur activité
      sont vérifiés à l&apos;inscription. Tout le monde peut créer un compte acheteur.
    </p>
    <p>
      Un message d&apos;erreur sur le SIRET ? Consultez{" "}
      <Link href={getHelpHref("erreurs-frequentes")}>les erreurs les plus fréquentes</Link>.
    </p>

    <h2>Se connecter</h2>
    <p>
      Ouvrez la page <Link href="/connexion">Se connecter</Link> et saisissez votre e-mail et votre mot de passe.
    </p>
    <p>
      Mot de passe oublié : cliquez sur <Ui>Mot de passe oublié ?</Ui> sous le formulaire de connexion. Vous recevez un
      e-mail avec un lien pour en choisir un nouveau.
    </p>

    <h2>Modifier son profil</h2>
    <p>
      Dans le menu, <Ui>Mon profil</Ui> vous permet de modifier vos informations. L&apos;adresse e-mail ne peut pas être
      changée.
    </p>
  </HelpPage>
)

export default CreateAccountHelpPage
