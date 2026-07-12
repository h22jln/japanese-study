import { z } from "zod";

export const analysisSchema = z.object({
  title: z.string(),
  bodyText: z.string(),
  vocabulary: z.array(z.object({
    surface: z.string(),
    dictionaryForm: z.string(),
    reading: z.string(),
    meaningKo: z.string(),
    partOfSpeech: z.string(),
    exampleJa: z.string().nullable(),
    exampleKo: z.string().nullable(),
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
