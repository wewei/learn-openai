import { AzureKeyCredential, OpenAIClient } from "@azure/openai";

const endpoint = process.env.END_POINT || "";
const azureApiKey = process.env.API_KEY || "";

export const client = new OpenAIClient(
    endpoint,
    new AzureKeyCredential(azureApiKey)
);
