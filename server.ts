import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini Client
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not defined. Please specify your Gemini API Key in the Secrets pane in the AI Studio sidebar.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// API endpoint to generate technical DB specification schema
app.post("/api/generate", async (req, res) => {
  try {
    const { 
      entityName, 
      divisionLabel, 
      classLabel, 
      entityDescription, 
      entityType,
      classCode,
      language = "en"
    } = req.body;

    if (!entityName || !divisionLabel || !classLabel) {
      return res.status(400).json({ error: "Missing required parameters: entityName, divisionLabel, classLabel" });
    }

    const ai = getGeminiClient();

    const systemInstruction = `You are a Senior Data Architect specializing in the "${divisionLabel}" industry segment. Provide a comprehensive technical data schema for the selected database entity: "${entityName}" (Type: ${entityType}). Ensure the schema is highly detailed, realistic, and specific to the ISIC Rev 5 activity class "${classLabel}" (${classCode}).
All content including architectureNotes, column descriptions, and constraint descriptions MUST be returned in the selected language: "${language}" (where 'pe' is Persian/Farsi, 'de' is German/Deutsch, and 'en' is English).
IMPORTANT SPECIFICATION: The actual physical database table name 'entityName' and programming identifiers 'fieldName' and structural SQL 'dataType' should remain in standard SQL English format (e.g. lowercase snake_case for fieldName, standard SQL types for dataType), but the explanatory text, the 'description' attributes, constraint summaries, and 'architectureNotes' must be fully translated and localized into the selected language: "${language}".`;

    const prompt = `Define a relational/SQL database table/schema for the entity: "${entityName}".
Description of this entity context: "${entityDescription}".
EntityType is: "${entityType}".

The target language is: "${language}" (${language === 'pe' ? "Persian / فارسی" : language === 'de' ? "German / Deutsch" : "English"}). You must write all 'architectureNotes', 'description' fields, constraints descriptions, and provide realistic mock 'exampleValue' values in this requested language.

Return a structured JSON specification. Ensure you provide exactly 8 to 15 fields. The fields must represent a highly specific, production-ready schema for this industrial operations context, including:
1. Primary key triggers (e.g. uuid/id)
2. Domain-specific metrics (e.g. moisture level, temperature, throughput weight, sensor ID, batch code, unit of measure, regulatory codes)
3. Audit trails and timestamp tracking (createdAt, updatedBy, verificationStatus, status)

Ensure the table name ('entityName') and column names ('fieldName') are in snake_case English. Pick precise database column types like UUID, VARCHAR(255), TIMESTAMP WITH TIME ZONE, BOOLEAN, DECIMAL(12,4), INTEGER, or JSONB if appropriate. Add rigorous, realistic constraints (e.g. NOT NULL, DEFAULT now(), CHECK values, or PK) - write and translate these constraints details in ${language === 'pe' ? 'Persian' : language === 'de' ? 'German' : 'English'}.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            entityName: { type: Type.STRING, description: "The physical table name in snake_case, e.g. silo_inventory_ledger" },
            architectureNotes: { type: Type.STRING, description: "A detailed paragraph explaining physical storage suggestions, index strategies for high-performance query profiles, and data integrity/lifecycle recommendations tailored to this industry context under the specified language." },
            fields: {
              type: Type.ARRAY,
              description: "The list of table columns/fields",
              items: {
                type: Type.OBJECT,
                properties: {
                  fieldName: { type: Type.STRING, description: "Database-compatible lower-case snake_case physical column name." },
                  dataType: { type: Type.STRING, description: "Highly precise SQL-compatible type: UUID, VARCHAR(N), INT, NUMERIC(precision, scale), TIMESTAMP WITH TIME ZONE, BOOLEAN, JSONB, TEXT, etc." },
                  description: { type: Type.STRING, description: "Clear localized business description explanation of why this column is captured in this specific ISIC context." },
                  exampleValue: { type: Type.STRING, description: "A realistic non-empty localized example data value corresponding to the data type." },
                  constraints: { type: Type.STRING, description: "Explicit physical constraints: e.g. PRIMARY KEY, UNIQUE, NOT NULL, DEFAULT 'pending', CHECK (value >= 0), FOREIGN KEY REFERENCES table(id)" }
                },
                required: ["fieldName", "dataType", "description", "exampleValue", "constraints"]
              }
            }
          },
          required: ["entityName", "architectureNotes", "fields"]
        }
      }
    });

    const schemaText = response.text;
    if (!schemaText) {
      throw new Error("No data returned from Gemini API");
    }

    res.setHeader("Content-Type", "application/json");
    res.send(schemaText);
  } catch (err: any) {
    console.error("Gemini Generation Error:", err);
    res.status(500).json({ error: err.message || "An error occurred during schema rendering." });
  }
});

// Vite middleware implementation for dev / static asset rendering for prod
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite middleware mounted in Development mode");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log(`Serving static files from ${distPath} in Production mode`);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server started and listening on http://0.0.0.0:${PORT}`);
  });
}

bootstrap();
