import { z } from "zod";

export const analysisSchema = z.object({
  title: z.string(),
  bodyLines: z.array(z.string()),
  vocabulary: z.array(z.object({
    surface: z.string(),
    dictionaryForm: z.string(),
    reading: z.string(),
    meaningKo: z.string(),
    partOfSpeech: z.string(),
    jlptLevel: z.string().nullable(),
    sourcePage: z.number().int().positive().nullable(),
  })),
  grammarPoints: z.array(z.object({
    pattern: z.string(),
    meaningKo: z.string(),
    explanationKo: z.string(),
    exampleJa: z.string().nullable(),
    exampleKo: z.string().nullable(),
  })),
});

export type AnalysisResult = z.infer<typeof analysisSchema>;
