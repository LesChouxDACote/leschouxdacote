import { createTheme } from "@mui/material/styles"
import { COLORS, FONT, RADIUS, SIZES } from "src/constants"

// Les composants MUI (créneaux, réservations, menus, interrupteurs) reprennent la palette, la police et l'arrondi
// de l'interface au lieu du bleu et de la police MUI par défaut
export const theme = createTheme({
  palette: {
    primary: { main: COLORS.green, contrastText: COLORS.white },
    error: { main: COLORS.red },
    info: { main: COLORS.blue },
    success: { main: COLORS.green },
    text: { primary: COLORS.text, secondary: COLORS.muted },
    divider: COLORS.border,
  },
  typography: {
    fontFamily: FONT,
    h2: { fontSize: SIZES.subtitle, fontWeight: 400 },
    h6: { fontSize: SIZES.regular, fontWeight: 500 },
    body1: { fontSize: SIZES.regular },
    body2: { fontSize: SIZES.small },
    button: { textTransform: "none", fontSize: SIZES.regular, fontWeight: 400 },
  },
  shape: { borderRadius: RADIUS },
  components: {
    // messages d'erreur sous les champs : même taille que ceux des formulaires du site
    MuiFormHelperText: { styleOverrides: { root: { fontSize: SIZES.small } } },
  },
})
