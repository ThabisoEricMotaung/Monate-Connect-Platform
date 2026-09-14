export const PROVINCE_IDS: Record<string, string> = {
  "Western Cape": "WC",
  "Northern Cape": "NC",
  "North West": "NW",
  "Free State": "FS",
  "Gauteng": "GP",
  "Mpumalanga": "MP",
  "Limpopo": "LP",
  "KwaZulu-Natal": "KZN",
  "Eastern Cape": "EC",
}

export const provinceMeta = {
  WC: { name: "Western Cape" },
  NC: { name: "Northern Cape" },
  NW: { name: "North West" },
  FS: { name: "Free State" },
  GP: { name: "Gauteng" },
  MP: { name: "Mpumalanga" },
  LP: { name: "Limpopo" },
  KZN: { name: "KwaZulu-Natal" },
  EC: { name: "Eastern Cape" },
}

export function normalizeProvinceGeoJSON(data: any) {
  return {
    type: "FeatureCollection",
    features: data.features.map((feature: any) => {
      const rawName =
        feature.properties.shapeName ??
        feature.properties.name ??
        feature.properties.NAME_1

      const name =
        rawName === "KwaZulu Natal"
          ? "KwaZulu-Natal"
          : rawName

      return {
        type: "Feature",
        properties: {
          name,
          id: PROVINCE_IDS[name],
        },
        geometry: feature.geometry,
      }
    }),
  }
}
