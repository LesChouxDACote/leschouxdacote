import { yupResolver } from "@hookform/resolvers/yup/dist/yup"
import { USER_ROLE } from "src/constants"
import { MIN_PASSWORD_LENGTH, validatePassword, validatePhoneNumber, validateSiret } from "src/helpers/validators"
import { object, string } from "yup"

const registerSchema = object().shape({
  role: string().required("Champs requis").oneOf([USER_ROLE.BUYER, USER_ROLE.PRODUCER], "Choisir une valeur"),
  siret: string().when("role", {
    is: USER_ROLE.PRODUCER,
    then: () => string()
      .required("Champs requis")
      .test("is-valid-siret", "SIRET invalide", (value) => (value ? validateSiret(value) === true : false)),
  }),
  name: string().when("role", {
    is: USER_ROLE.PRODUCER,
    then: () => string().max(180, "Ne doit pas dépasser 180 caractères").required("Champs requis"),
  }),
  address: string().when("role", {
    is: USER_ROLE.PRODUCER,
    then: () => string().required("Champs requis"),
  }),
  description: string().when("role", {
    is: USER_ROLE.PRODUCER,
    then: () => string()
      .min(15, "Doit contenir au moins 15 caractères")
      .max(4000, "Ne doit pas dépasser 4000 caractères")
      .required("Champs requis"),
  }),
  phone: string().when("role", {
    is: USER_ROLE.PRODUCER,
    then: () => string()
      .required("Champs requis")
      .test("is-valid-phone", "Désolé, le numéro de téléphone est invalide", (value) =>
        value ? validatePhoneNumber(value) === true : false
      ),
  }),
  firstname: string().max(50, "Ne doit pas dépasser 50 caractères").required("Champs requis"),
  lastname: string().max(50, "Ne doit pas dépasser 50 caractères").required("Champs requis"),
  email: string().required("Champs requis"),
  password: string()
    .min(MIN_PASSWORD_LENGTH, `Doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères`)
    .required("Champs requis")
    .test(
      "is-valid-password",
      `Désolé, le mot de passe doit contenir ${MIN_PASSWORD_LENGTH} caractères minimum dont au moins 1 majuscule, 1 minuscule et 1 chiffre`,
      (value) => (value ? validatePassword(value) === true : false)
    ),
})

export const registerResolver = yupResolver(registerSchema)
