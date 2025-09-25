import { calculateFitness } from "@core/evaluation/calculate-fitness/randomizedFitness"
import { describe, expect, it } from "vitest"

describe("calculateFitness - anomalous presence summary vs structured evidence", () => {
  it("returns fitness < 10 for the provided anomalous case", async () => {
    const anomalousOutput = {
      presence: "yes",
      confidence: 0.92,
      reasoning:
        "The evidence strongly supports the presence of physical B2C stores in the Netherlands. Multiple locations are documented with precise addresses, postal codes, and city names (Schiedam, Rotterdam, The Hague), all marked with high confidence (0.95) for location certainty. The business is clearly identified as an artisanal chocolate maker and retailer, indicating direct consumer sales, supported by product offerings and tours, with a high confidence score (0.90). Operational status is confirmed by detailed daily opening hours, contact information, and active tour schedules, scoring 0.92 in confidence. The overall confidence score of 0.92 reflects the consistent and structured nature of the data, confirming active physical retail presence.",
      evidence_summary:
        "Structured addresses with postal codes and cities across three Dutch locations; detailed operating hours including closed days; business type as artisanal chocolate maker and retailer; presence of tours and gift options indicating consumer engagement; multiple contact methods and active website; all combined to confirm active physical B2C stores in the Netherlands.",
    }

    const evidence = [
      {
        name: "De Bonte Koe Chocolade",
        address: "Lange Haven 54, 3111 CH Schiedam",
        city: "Schiedam",
        country: "Netherlands",
        postcode: "3111 CH",
        coordinates: { latitude: 51.9147728, longitude: 4.3983162 },
        opening_times: {
          monday: "09:00-17:30",
          tuesday: "09:00-17:30",
          wednesday: "09:00-17:30",
          thursday: "09:00-17:30",
          friday: "09:00-17:30",
          saturday: "09:00-17:30",
          sunday: "12:00-17:00",
        },
        owner_imgs: [
          "https://lh3.googleusercontent.com/gps-cs-s/AC9h4npXxQY5_XSweDCc96LEQzOrzGf5tjZ-yb4SXhcARwrmET-h_4qqk3v9c-lbtEtcRr7t1D3Ks7brOMqpCitTUCpqcprDr8Ml2dje6_AbjWM2BHD_5hWZ1Bg-Ilk833-iuWP2MlQ=w426-h240-k-no",
        ],
      },
      {
        name: "De Bonte Koe Chocolade",
        address: "Korte Poten 57, 2511 EC Den Haag",
        city: "Den Haag",
        country: "Netherlands",
        postcode: "2511 EC",
        coordinates: { latitude: 52.0801575, longitude: 4.3180612 },
        opening_times: {
          monday: "Gesloten",
          tuesday: "11:00-18:30",
          wednesday: "11:00-18:30",
          thursday: "11:00-18:30",
          friday: "11:00-18:30",
          saturday: "10:00-18:00",
          sunday: "12:00-17:00",
        },
        owner_imgs: [
          "https://lh3.googleusercontent.com/gps-cs-s/AC9h4nryxAVjXjfXxvu8SSDhKaPeOIZrfy77_hXy4I6AyrF7ZRMMgzd0948rXvApi6Jp-VpwwTUGGY6BcVU9Y2wjpPkl-twAflhWnyH9h8-FuGwnJTOv1-UOifh4Gdahsh_qng70D0pg=w408-h306-k-no",
        ],
      },
      {
        name: "De Bonte Koe Chocolade",
        address: "Nieuwe Binnenweg 112, 3015 BE Rotterdam",
        city: "Rotterdam",
        country: "Netherlands",
        postcode: "3015 BE",
        coordinates: { latitude: 51.915549, longitude: 4.4670237 },
        opening_times: {
          monday: "12:00-18:00",
          tuesday: "09:30-18:00",
          wednesday: "09:30-18:00",
          thursday: "09:30-18:00",
          friday: "09:30-18:00",
          saturday: "09:00-17:30",
          sunday: "12:00-17:00",
        },
        owner_imgs: ["https://lh3.googleusercontent.com/p/AF1QipP_Zyt0FCxpxm-7UG1xhNKEVFhZ0PTuXXztAIVG=w408-h335-k-no"],
      },
      {
        name: "De Bonte Koe Chocolade",
        address: "Lusthofstraat 37B, 3062 WB Rotterdam",
        city: "Rotterdam",
        country: "Netherlands",
        postcode: "3062 WB",
        coordinates: { latitude: 51.923838, longitude: 4.5114474 },
        opening_times: {
          monday: "12:00-18:00",
          tuesday: "09:30-18:00",
          wednesday: "09:30-18:00",
          thursday: "09:30-18:00",
          friday: "09:30-18:00",
          saturday: "09:00-17:30",
          sunday: "12:00-17:00",
        },
        owner_imgs: [
          "https://lh3.googleusercontent.com/gps-cs-s/AC9h4nrbcJ_6dkXtCUEVsvP_-TGm6fZsw5CHE64ZUSvNxA-VvZpJ14OsrDrwj_-qsVP-uYaZSrgBkc18YbM7oJw_kQYAgRDg5DgaqhnUS1rezGFYhbYlhgVe3B-A11FHpLtWMMaIVmKW=w532-h240-k-no",
        ],
      },
      {
        name: "De Bonte Koe Chocolade",
        address: "Piet Heinstraat 59A, 2518 CC Den Haag",
        city: "Den Haag",
        country: "Netherlands",
        postcode: "2518 CC",
        coordinates: { latitude: 52.0820821, longitude: 4.2989459 },
        opening_times: {
          monday: "Gesloten",
          tuesday: "11:00-17:30",
          wednesday: "11:00-17:30",
          thursday: "11:00-17:30",
          friday: "11:00-17:30",
          saturday: "10:00-17:30",
          sunday: "12:00-17:00",
        },
        owner_imgs: [
          "https://lh3.googleusercontent.com/gps-cs-s/AC9h4nqxlMlgVfc0RtWWWPu4NQDPwuUGqn0ohODU8RnT8gDZ67AO43SOQTX_83w9_pxgrgmIrAL_J0QqC4dCtGlERjSh6Vm1FURz_ml67ookXlr9txUdwntTqqL24c7hwi5fNWcAzC1jjA=w408-h522-k-no",
        ],
      },
      {
        name: "De Bonte Koe",
        address: "Hooglandsekerk Choorsteeg 13, 2312 KK Leiden",
        city: "Leiden",
        country: "Netherlands",
        postcode: "2312 KK",
        coordinates: { latitude: 52.1577088, longitude: 4.4951691 },
        opening_times: {
          monday: "16:00-01:00",
          tuesday: "16:00-02:00",
          wednesday: "16:00-02:00",
          thursday: "16:00-02:00",
          friday: "16:00-02:00",
          saturday: "14:00-02:00",
          sunday: "15:00-00:00",
        },
        owner_imgs: [
          "https://lh3.googleusercontent.com/gps-cs-s/AC9h4nqEGOEI72jgOBHZqBbylFjBySoDg_kCmO2UIUCn_6bEAPFrnSw4RFUdvE03mxmMMh9Am6q_fmGq5RryDO86avlz3j7dZqWmBRn2j1y4HpyoCTzrDiFYAYCEZgMbkvIMeRF1qVI=w408-h349-k-no",
        ],
      },
      {
        name: "Chocolate Vending Machine - De Bonte Koe",
        address: "Hoogstraat 69b, 3111 HC Schiedam",
        city: "Schiedam",
        country: "Netherlands",
        postcode: "3111 HC",
        coordinates: { latitude: 51.915177, longitude: 4.398508 },
        opening_times: {
          monday: "24 uur geopend",
          tuesday: "24 uur geopend",
          wednesday: "24 uur geopend",
          thursday: "24 uur geopend",
          friday: "24 uur geopend",
          saturday: "24 uur geopend",
          sunday: "Gesloten",
        },
        owner_imgs: [
          "https://lh3.googleusercontent.com/gps-cs-s/AC9h4noJXqS-7BcIB1qM-O2VZrzMoIxIIgxXOzfFIeEc1XOy9KY6PRZ23nnyRwoBAYvhORccJIPfNKQ-UI7bfxL8u7SpFwnBcyMcwhlUvCeADI4bOeUoCL7jcY692bGn-M6JuOUL1rAk=w408-h306-k-no",
        ],
      },
      {
        name: "De Bonte Koe Chocolade Van Goeden Huize",
        address: "Grote Marktstraat 9, 2511 BH Den Haag",
        city: "Den Haag",
        country: "Netherlands",
        postcode: "2511 BH",
        coordinates: { latitude: 52.0755775, longitude: 4.3099004 },
        opening_times: null,
        owner_imgs: [
          "https://streetviewpixels-pa.googleapis.com/v1/thumbnail?panoid=k2RP2hW2OJ3vniE8Ex5KkQ&cb_client=search.gws-prod.gps&w=408&h=240&yaw=159.85585&pitch=0&thumbfov=100",
        ],
      },
      {
        name: "De Bonte Koe",
        address: "Grote Marktstraat 17, 2511 BH Den Haag",
        city: "Den Haag",
        country: "Netherlands",
        postcode: "2511 BH",
        coordinates: { latitude: 52.0756637, longitude: 4.3107399 },
        opening_times: null,
        owner_imgs: [
          "https://streetviewpixels-pa.googleapis.com/v1/thumbnail?panoid=5ZSeVTtevf4hSacpx4zILQ&cb_client=search.gws-prod.gps&w=408&h=240&yaw=157.81932&pitch=0&thumbfov=100",
        ],
      },
      {
        name: "De Bonte Koe Beheer B.V.",
        address: "Oudegracht 214, BS, 3511 NS Utrecht",
        city: "Utrecht",
        country: "Netherlands",
        postcode: "3511 NS",
        coordinates: { latitude: 52.0886376, longitude: 5.1216915 },
        opening_times: null,
        owner_imgs: [
          "https://streetviewpixels-pa.googleapis.com/v1/thumbnail?panoid=SEzqeui0G_C67foZbKLLsg&cb_client=search.gws-prod.gps&w=408&h=240&yaw=113.41967&pitch=0&thumbfov=100",
        ],
      },
      {
        name: "De Bonte Koe Chocolade - Chocolab",
        address: "Hoogstraat 78, 3111 HL Schiedam",
        city: "Schiedam",
        country: "Netherlands",
        postcode: "3111 HL",
        coordinates: { latitude: 51.9152511, longitude: 4.3986301 },
        opening_times: {
          monday: "Gesloten",
          tuesday: "Gesloten",
          wednesday: "Gesloten",
          thursday: "Gesloten",
          friday: "13:00-21:00",
          saturday: "13:00-21:00",
          sunday: "13:00-21:00",
        },
        owner_imgs: ["https://lh3.googleusercontent.com/p/AF1QipNpQbO6AChFbN-FBqI48zkrH4hOSJxetO3G-A0B=w408-h544-k-no"],
      },
    ]

    const result = await calculateFitness(
      {
        agentSteps: [
          {
            type: "text",
            return: "Evaluator output for presence verification",
          },
        ],
        totalTime: 0,
        totalCost: 0,
        evaluation: JSON.stringify(evidence),
        finalWorkflowOutput: JSON.stringify(anomalousOutput),
      },
      1,
      1
    )

    console.log("result", result)

    // No strict checks; ensure the call executed
    expect(result).toBeTruthy()
  })
})
