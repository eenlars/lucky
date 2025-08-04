const exampleFeature = {
  id: "address.8551082883407514",
  type: "Feature",
  place_type: ["address"],
  relevance: 1,
  properties: {
    accuracy: "rooftop",
    mapbox_id:
      "dXJuOm1ieGFkcjo5MThkOTFiNC04MGY3LTQxMGEtODZhNS04NjczZDAzNjBiODU",
  },
  text: "Monseigneur Van Roosmalenplein",
  place_name:
    "Monseigneur Van Roosmalenplein 19, 5213 GC 's-Hertogenbosch, Netherlands",
  matching_place_name:
    "Monseigneur Van Roosmalenplein 19, 5213 GC Den Bosch, Netherlands",
  center: [5.329461, 51.696192],
  geometry: {
    type: "Point",
    coordinates: [5.329461, 51.696192],
  },
  address: "19",
  context: [
    {
      id: "neighborhood.27561128",
      mapbox_id: "dXJuOm1ieHBsYzpBYVNNcUE",
      text: "Graafsebuurt-Noord",
    },
    {
      id: "postcode.8551082883407514",
      text: "5213 GC",
    },
    {
      id: "locality.3263144",
      mapbox_id: "dXJuOm1ieHBsYzpNY3Fv",
      text: "Graafsepoort",
    },
    {
      id: "place.15100072",
      mapbox_id: "dXJuOm1ieHBsYzo1bWlv",
      wikidata: "Q9807",
      text: "'s-Hertogenbosch",
    },
    {
      id: "region.17576",
      mapbox_id: "dXJuOm1ieHBsYzpSS2c",
      wikidata: "Q1101",
      short_code: "NL-NB",
      text: "North Brabant",
    },
    {
      id: "country.8872",
      mapbox_id: "dXJuOm1ieHBsYzpJcWc",
      wikidata: "Q55",
      short_code: "nl",
      text: "Netherlands",
    },
  ],
}

type MapboxFeature = typeof exampleFeature

export { exampleFeature, type MapboxFeature }
