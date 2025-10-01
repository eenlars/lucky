import Anthropic from "@anthropic-ai/sdk"
const client = new Anthropic({ apiKey: "test" })
console.log("Client keys:", Object.keys(client))
console.log("Has models:", "models" in client)
if ("models" in client) {
  const models = (client as any).models
  console.log("Models type:", typeof models)
  console.log("Has list:", typeof models?.list)
}
