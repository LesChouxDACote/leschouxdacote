import Bugsnag from "@bugsnag/js"
import { useRouter } from "next/router"
import React, { createContext, useContext, useEffect, useState } from "react"
import { USER_ROLE } from "src/constants"
import api from "src/helpers/api"
import { auth, firestore, getObject } from "src/helpers/firebase"
import { getName } from "src/helpers/user"
import type { AuthUser, User } from "src/types/model"

const ANONYMOUS_ROUTES = ["/connexion", "/inscription", "/confirmation", "/mot-de-passe-oublie"]
const ADMIN_ROUTES = ["/csv-export"]

export interface IUserContext<T extends User = User> {
  loading: boolean
  wait: boolean
  authUser: AuthUser | null
  user: T | null
  signin: (email: string, pass: string) => Promise<UserCredential>
  signout: () => void
  toggleFollow: (producerUid: string, follow: boolean) => Promise<void>
  toggleEmailAlert: (producerUid: string, active: boolean) => Promise<void>
}

const UserContext = createContext<IUserContext>({} as IUserContext)

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const { pathname, asPath, query, replace } = useRouter()

  useEffect(() => {
    return auth.onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        setAuthUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email as string,
          name: firebaseUser.displayName as string,
        })
      } else {
        setAuthUser(null)
      }
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (authUser) {
      return firestore
        .collection("users")
        .doc(authUser.uid)
        .onSnapshot((doc) => {
          setUser(getObject(doc) as User)
        })
    } else {
      setUser(null)
    }
  }, [authUser])

  useEffect(() => {
    if (user) {
      Bugsnag.setUser(user.objectID, user.email, getName(user))
    } else {
      Bugsnag.setUser()
    }
  }, [user])

  const signin = (email: string, password: string) => auth.signInWithEmailAndPassword(email, password)

  const isPrivateRoute = pathname.startsWith("/compte")
  const isProducerRoute = pathname.startsWith("/compte/producteur")

  const signout = () => {
    if (isPrivateRoute) {
      replace("/").then(() => auth.signOut())
    } else {
      auth.signOut()
    }
  }

  const redirectUrl = (() => {
    if (loading) {
      return null
    }
    const destination = query.next as string
    if (user && user.role !== USER_ROLE.PRODUCER && isProducerRoute) {
      return "/"
    }
    if (authUser && user?.role === USER_ROLE.PRODUCER && ANONYMOUS_ROUTES.includes(pathname)) {
      return destination || "/compte/producteur/annonces"
    }
    if (authUser && user?.role === USER_ROLE.BUYER && ANONYMOUS_ROUTES.includes(pathname)) {
      return destination || "/"
    }
    if (authUser && user?.role === USER_ROLE.ADMIN && ANONYMOUS_ROUTES.includes(pathname)) {
      return "/csv-export"
    }

    if (!authUser && isPrivateRoute) {
      return "/connexion?next=" + asPath
    }
    if (authUser && user?.role !== USER_ROLE.ADMIN && ADMIN_ROUTES.includes(pathname)) {
      return "/"
    }
  })()

  useEffect(() => {
    if (redirectUrl) {
      replace(redirectUrl)
    }
  }, [redirectUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  const wait = Boolean(redirectUrl) || (isPrivateRoute && !user)

  const toggleFollow = async (producerUid: string, follow: boolean) => {
    if (!authUser || !user) {
      replace("/connexion?next=" + asPath)
      return
    }

    const followedProducers = { ...user.followedProducers }

    if (follow) {
      followedProducers[producerUid] = { emailAlert: true } // the rest will be added by the backend
    } else {
      delete followedProducers[producerUid]
    }

    setUser({
      ...user,
      followedProducers,
    })

    await api.post("follow", { producerUid, follow })
  }

  const toggleEmailAlert = async (producerUid: string, active: boolean) => {
    if (!authUser || !user) {
      replace("/connexion?next=" + asPath)
      return
    }

    const followedProducers = { ...user.followedProducers }
    followedProducers[producerUid].emailAlert = active

    setUser({
      ...user,
      followedProducers,
    })

    await api.put("follow", { producerUid, active })
  }

  return (
    <UserContext.Provider
      value={{
        loading,
        wait,
        authUser,
        user,
        signin,
        signout,
        toggleFollow,
        toggleEmailAlert,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export function useUser<T extends User = User>() {
  return useContext(UserContext) as IUserContext<T>
}
