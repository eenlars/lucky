import type { EvaluationInput } from "@/core/workflow/ingestion/ingestion.types"
import { ExpectedOutputSchema } from "@/runtime/schemas/output.types"

const QUESTIONS = {
  albertHeijn: {
    type: "text",
    goal: "Of the brand albert heijn, find all the addresses of the store locations in Den Bosch, the Netherlands. - make sure to include every single store possible (hard to find). Keep it very short but verifiable.",
    question:
      "Of the brand albert heijn, find all the addresses of the store locations in Den Bosch, the Netherlands. - make sure to include every single store possible (hard to find). Keep it very short but verifiable.",
    answer:
      "street_name,store_name,city,house_number,company_url,company_name\nArena,Albert Heijn,'S-Hertogenbosch,16,albertheijn.nl,Albert Heijn\nGruttostraat,Albert Heijn,'S-Hertogenbosch,23,albertheijn.nl,Albert Heijn\nHelftheuvelpassage,Albert Heijn,'S-Hertogenbosch,1,albertheijn.nl,Albert Heijn\nLokerenpassage,Albert Heijn,'S-Hertogenbosch,25,albertheijn.nl,Albert Heijn\nMgr. Van Roosmalenplein,Albert Heijn,'S-Hertogenbosch,19,albertheijn.nl,Albert Heijn\nRompertpassage,Albert Heijn,'S-Hertogenbosch,45,albertheijn.nl,Albert Heijn\nSint Teunislaan,Albert Heijn,'S-Hertogenbosch,84,albertheijn.nl,Albert Heijn\nStationsplein,Albert Heijn,'S-Hertogenbosch,143,albertheijn.nl,Albert Heijn\nVughterstraat,Albert Heijn,'S-Hertogenbosch,46,albertheijn.nl,Albert Heijn",
    workflowId: "wf-albert-heijn",
  },
  hard: {
    type: "text",
    question: `Give me the title of the scientific paper published in EMNLP 2018-2023 where the first author did their undergrad at Dartmouth and the fourth author at UPenn.`,
    answer:
      "Frequency Effects on Syntactic Rule Learning in Transformers, EMNLP 2021",
    goal: "find the title of the scientific paper",
    workflowId: "wf-scientific-paper",
  },
  rituals: {
    type: "text",
    question: `Find the city name of the Rituals store located at Binnenweg.`,
    answer: "Heemstede",
    goal: "find the city name of the Rituals store",
    workflowId: "wf-rituals-store",
  },
  ritualsHard: {
    type: "text",
    question: `Find how many stores rituals has in the Netherlands. it is a very precise number, and it is more than 50.`,
    answer: "109",
    goal: "find the number of rituals stores in the Netherlands",
    workflowId: "wf-rituals-store-hard",
  },
  differentStores: {
    type: "text",
    question: `Find the city name of the Rituals store located at Binnenweg, the albert heijn closest to the oosterpark in amsterdam, and i want to know how many jumbo supermarkets are in Nieuw vennep. Then find out which one of the previous mentioned stores also have stores in belgium.`,
    answer:
      "The city name of the rituals store is Heemstede, the city name of the albert heijn closest to the oosterpark in amsterdam is AH sarphatistraat, we have 1 jumbo supermarket in Nieuw vennep, and all of the previous stores are located in the Netherlands and also have stores in belgium.",
    goal: "create a workflow that answers the question as accurately as possible. it is not an easy task, but it is possible with the tools available.",
    workflowId: "wf-rituals-store",
  },
  differentStoresNoAnswer: {
    type: "text",
    question: `Find the city name of the Rituals store located at Binnenweg, the albert heijn closest to the oosterpark in amsterdam, and i want to know how many jumbo supermarkets are in Nieuw vennep. Then find out which one of the previous mentioned stores also have stores in belgium.`,
    answer: "the answer is not provided.",
    goal: "create a workflow that answers the question as accurately as possible. it is not an easy task, but it is possible with the tools available.",
    workflowId: "wf-rituals-store",
  },
  promptTest: {
    type: "prompt-only",
    goal: "What are the most popular b-corps in the Netherlands?",
    workflowId: "wf-prompt-test",
  },

  // SWE-bench evaluation inputs
  swebench: {
    type: "swebench",
    goal: "Fix the bug described in the issue by analyzing the problem statement and implementing a proper solution",
    workflowId: "swe-bench-solver",
  },

  // GAIA evaluation inputs
  gaia: {
    type: "gaia",
    taskId: "2023-validation-example",
    level: 1,
    split: "validation",
    goal: "Answer the GAIA benchmark question accurately using available tools and reasoning",
    workflowId: "gaia-solver",
  },

  emptyResponseCSV: {
    type: "csv",
    goal: `
    This is data of b-corporations. 
    We need to find the physical stores of every certified b-corportation in the Netherlands.
    If the HQ of the b-corp is not in the Netherlands AND the countries of operation field is empty, you can skip it.
    We only want the physical stores where customers can go to (B2C). if not, do not include it.
    `,
    evaluation: "column:expected_output",

    inputFile:
      "https://qnvprftdorualkdyogka.supabase.co/storage/v1/object/public/input//annotated-empty-response.csv",

    onlyIncludeInputColumns: [
      "company_name",
      "company_id",
      "current_status",
      "description",
      "industry",
      "industry_category",
      "products_and_services",
      "size",
      "operating_country",
      "b_corp_website",
      "website",
      "other_countries_of_operation",
    ],

    expectedOutputSchema: ExpectedOutputSchema,
    workflowId: "wf-b-corp-empty-response",
  },
  tonys: {
    type: "text",
    question:
      "Find the amount of locations of Tony's Chocolonely stores in the Netherlands",
    answer: "2",
    goal: "Find the amount of locations of Tony's Chocolonely stores in the Netherlands, headquarters excluded.",
    workflowId: "wf-tonys-chocolonely",
  },
  simpleCsv: {
    type: "csv",
    goal: `
    This is data of b-corporations. 
    We need to find the physical stores of every certified b-corportation in the Netherlands.
    If the HQ of the b-corp is not in the Netherlands AND the countries of operation field is empty, you can skip it.
    We only want the physical stores where customers can go to (B2C). if not, do not include it.
    `,
    evaluation: "column:expected_output",

    inputFile:
      "https://qnvprftdorualkdyogka.supabase.co/storage/v1/object/public/input//annotated.csv",

    onlyIncludeInputColumns: [
      "company_name",
      "company_id",
      "current_status",
      "description",
      "industry",
      "industry_category",
      "products_and_services",
      "size",
      "operating_country",
      "b_corp_website",
      "website",
      "other_countries_of_operation",
    ],

    // expectedOutputSchema: ExpectedOutputSchema,
    workflowId: "wf-b-corp-simple",
  },
  hardCsv: {
    type: "csv",
    goal: `
    This is data of b-corporations. 
    We need to find the physical stores of every certified b-corportation in the Netherlands.
    If the HQ of the b-corp is not in the Netherlands AND the countries of operation field is empty, you can skip it.
    We only want the physical stores where customers can go to (B2C). if not, do not include it.
    `,
    inputFile:
      "https://qnvprftdorualkdyogka.supabase.co/storage/v1/object/public/input//annotated-full.csv",
    evaluation: "column:expected_output",
    onlyIncludeInputColumns: [
      "company_name",
      "company_id",
      "current_status",
      "description",
      "industry",
      "industry_category",
      "products_and_services",
      "size",
      "operating_country",
      "b_corp_website",
      "website",
      "other_countries_of_operation",
    ],
    expectedOutputSchema: ExpectedOutputSchema,
    workflowId: "wf-b-corp-sample",
  },
  extremeCsv: {
    type: "csv",
    goal: `
    This is data of b-corporations. 
    We need to find the physical stores of every certified b-corportation in the Netherlands.
    If the HQ of the b-corp is not in the Netherlands AND the countries of operation field is empty, you can skip it.
    We only want the physical stores where customers can go to (B2C). if not, do not include it.
    `,
    inputFile:
      "https://qnvprftdorualkdyogka.supabase.co/storage/v1/object/public/input//Data%20exports%20-%2016_7_2025.csv",
    // evaluation: "column:expected_output",
    onlyIncludeInputColumns: [
      "company_name",
      "company_id",
      "current_status",
      "description",
      "industry",
      "industry_category",
      "products_and_services",
      "size",
      "operating_country",
      "b_corp_website",
      "website",
      "other_countries_of_operation",
    ],
    expectedOutputSchema: ExpectedOutputSchema,
    workflowId: "wf-b-corp-sample",
  },
} satisfies Record<string, EvaluationInput>

export { QUESTIONS }
export const SELECTED_QUESTION: EvaluationInput = QUESTIONS.ritualsHard
