import { Context, Effect, Layer, Option, Schema as Sc } from "effect"
import { AppConfig } from "./config"
import { CoolifyError } from "./errors"
import { CoolifyDeployment } from "./schemas"

export interface CoolifyClientShape {
  readonly enabled: boolean
  readonly appUuid: string
  // déploiements récents de l'application (du plus récent au plus ancien)
  readonly listDeployments: Effect.Effect<ReadonlyArray<CoolifyDeployment>, CoolifyError>
  // détail d'un déploiement, avec ses logs si le token a la permission read:sensitive
  readonly getDeployment: (uuid: string) => Effect.Effect<CoolifyDeployment, CoolifyError>
  // dernier déploiement du preview d'une PR, avec ses logs (None : aucun déploiement trouvé)
  readonly latestDeploymentFor: (prNumber: number) => Effect.Effect<Option.Option<CoolifyDeployment>, CoolifyError>
  // les logs des déploiements ne sont renvoyés qu'aux tokens ayant la permission read:sensitive ;
  // None si l'application n'a encore aucun déploiement
  readonly logsVisible: Effect.Effect<Option.Option<boolean>, CoolifyError>
  // page du déploiement dans l'UI Coolify (logs complets pour un humain)
  readonly deploymentPage: (deployment: CoolifyDeployment) => string | undefined
}

export class CoolifyClient extends Context.Service<CoolifyClient, CoolifyClientShape>()("CoolifyClient") {}

// la spec OpenAPI annonce un tableau, l'API réelle (4.3.x) renvoie { count, deployments } : on accepte les deux
const DeploymentList = Sc.Union([Sc.Array(CoolifyDeployment), Sc.Struct({ deployments: Sc.Array(CoolifyDeployment) })])

const disabled = Effect.fail(
  new CoolifyError({ message: "Suivi Coolify non configuré (COOLIFY_API_URL, COOLIFY_API_TOKEN, COOLIFY_APP_UUID)" }),
)

export const CoolifyClientLive = Layer.effect(
  CoolifyClient,
  Effect.gen(function* () {
    const { coolify } = yield* AppConfig
    if (Option.isNone(coolify)) {
      const client: CoolifyClientShape = {
        enabled: false,
        appUuid: "",
        listDeployments: disabled,
        getDeployment: () => disabled,
        latestDeploymentFor: () => disabled,
        logsVisible: disabled,
        deploymentPage: () => undefined,
      }
      return client
    }
    const { apiUrl, token, appUuid } = coolify.value

    const request = (method: string, path: string) =>
      Effect.gen(function* () {
        const response = yield* Effect.tryPromise({
          try: (signal) =>
            fetch(`${apiUrl}/api/v1${path}`, {
              method,
              signal,
              headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
            }),
          catch: (cause) => new CoolifyError({ message: `Coolify ${method} ${path} : ${String(cause)}`, cause }),
        })
        if (!response.ok) {
          const body = yield* Effect.tryPromise({
            try: () => response.text(),
            catch: () => new CoolifyError({ message: `Coolify ${method} ${path} : ${response.status}` }),
          })
          return yield* Effect.fail(
            new CoolifyError({ message: `Coolify ${method} ${path} : ${response.status} ${body.slice(0, 300)}` }),
          )
        }
        return yield* Effect.tryPromise({
          try: () => response.json() as Promise<unknown>,
          catch: (cause) => new CoolifyError({ message: `Coolify ${method} ${path} : réponse JSON invalide`, cause }),
        })
      })

    const decoded = <S extends Sc.Top>(schema: S, method: string, path: string) =>
      request(method, path).pipe(
        Effect.flatMap((json) =>
          Sc.decodeUnknownEffect(schema)(json).pipe(
            Effect.mapError(
              (cause) =>
                new CoolifyError({
                  message: `Coolify ${method} ${path} : réponse inattendue (${cause.message})`,
                  cause,
                }),
            ),
          ),
        ),
      )

    const listDeployments = (take: number) =>
      decoded(DeploymentList, "GET", `/deployments/applications/${appUuid}?skip=0&take=${take}`).pipe(
        Effect.map((body) => ("deployments" in body ? body.deployments : body)),
      )

    const client: CoolifyClientShape = {
      enabled: true,
      appUuid,
      listDeployments: listDeployments(30),
      getDeployment: (uuid) => decoded(CoolifyDeployment, "GET", `/deployments/${uuid}`),
      latestDeploymentFor: (prNumber) =>
        listDeployments(100).pipe(
          Effect.flatMap((deployments) => {
            const latest = deployments.find((deployment) => deployment.pull_request_id === prNumber)
            return latest
              ? decoded(CoolifyDeployment, "GET", `/deployments/${latest.deployment_uuid}`).pipe(
                  Effect.map(Option.some),
                )
              : Effect.succeed(Option.none<CoolifyDeployment>())
          }),
        ),
      logsVisible: Effect.gen(function* () {
        const deployments = yield* listDeployments(1)
        if (deployments.length === 0) {
          return Option.none<boolean>()
        }
        const json = yield* request("GET", `/deployments/${deployments[0].deployment_uuid}`)
        return Option.some(typeof json === "object" && json !== null && "logs" in json)
      }),
      deploymentPage: (deployment) => (deployment.deployment_url ? `${apiUrl}${deployment.deployment_url}` : undefined),
    }
    return client
  }),
)
