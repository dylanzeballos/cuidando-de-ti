/**
 * Identidad de esta instalación.
 *
 * La plataforma se despliega una empresa por instalación. Este es el nombre y el
 * sector con los que la administración se identifica siempre, de modo que el
 * panel nunca muestre la marca de otra empresa aunque el backend aún devuelva la
 * configuración de desarrollo. La configuración del servidor sigue aportando
 * tema y módulos. Cambiar de cliente es editar este archivo.
 */
export const INSTALLATION = {
  name: 'Cuidando de Ti',
  sector: 'Farmacia',
} as const;
