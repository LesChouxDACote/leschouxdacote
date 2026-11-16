import styled from "@emotion/styled"
import { DefaultValues } from "react-hook-form"
import AddressInput from "src/components/AddressInput"
import { Button } from "src/components/Button"
import { Form, SubmitButton, TextInput } from "src/components/Form"
import { USER_ROLE } from "src/constants"
import api from "src/helpers/api"
import { useUser } from "src/helpers/auth"
import { validatePhoneNumber } from "src/helpers/validators"
import Layout from "src/layout"
import type { UpdatingUser } from "src/types/model"

const DangerZone = styled.div`
  margin-top: 4em;
  text-align: center;
`

const MyAccountPage = () => {
  const { user, signout } = useUser()

  const handleSubmit: Submit<UpdatingUser> = async (values) => {
    await api.put("user", values)
    alert("Modifications effectuées")
  }

  const handleDelete = async () => {
    if (confirm("Voulez-vous vraiment supprimer votre compte producteur et toutes vos annonces ?!")) {
      await api.delete("user")
      signout()
      alert("Votre compte a bien été supprimé")
    }
  }

  return (
    <Layout title="Mon compte" noindex>
      <Form title="Mon profil" hasRequired onSubmit={handleSubmit} defaultValues={user as DefaultValues<UpdatingUser>}>
        {user?.role === USER_ROLE.PRODUCER && (
          <>
            <TextInput name="name" label="Nom commercial" required maxLength={180} />
            <AddressInput name="address" label="Adresse" required />
            <TextInput name="description" label="Description" rows={6} required minLength={15} maxLength={4000} />
            <TextInput name="phone" label="Téléphone" type="tel" required validate={validatePhoneNumber} />
          </>
        )}
        <TextInput name="firstname" label="Prénom" required maxLength={50} />
        <TextInput name="lastname" label="Nom" required maxLength={50} />
        <TextInput name="email" label="E-mail" type="email" disabled />
        <SubmitButton />
        <DangerZone>
          <Button type="button" $variant="red" onClick={handleDelete}>
            Supprimer le compte
          </Button>
        </DangerZone>
      </Form>
    </Layout>
  )
}

export default MyAccountPage
