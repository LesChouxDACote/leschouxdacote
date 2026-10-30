import HelpPage, { Ui } from "src/components/HelpPage"

const FavoritesHelpPage = () => (
  <HelpPage title="Gérer ses favoris et ses alertes">
    <h2>Suivre un producteur</h2>
    <p>
      Sur la page d&apos;un producteur, cliquez sur <Ui>Suivre le producteur</Ui> : il rejoint vos favoris. Pour
      l&apos;en retirer, cliquez sur <Ui>Ne plus suivre le producteur</Ui>.
    </p>

    <h2>Recevoir un e-mail à chaque nouvelle annonce</h2>
    <p>
      Dans le menu, <Ui>Mes alertes</Ui> liste vos producteurs favoris. Pour chacun :
    </p>
    <ul>
      <li>
        l&apos;interrupteur <Ui>Alertes pour les nouvelles annonces</Ui> vous envoie un e-mail quand il publie une
        annonce ;
      </li>
      <li>la corbeille le retire de vos favoris.</li>
    </ul>

    <h2>Producteurs : être prévenu quand une annonce expire</h2>
    <p>
      Dans <Ui>Mes alertes</Ui>, activez <Ui>Recevoir des alertes lorsque mes annonces expirent</Ui> pour recevoir un
      e-mail à la fin de la publication de vos annonces.
    </p>
  </HelpPage>
)

export default FavoritesHelpPage
