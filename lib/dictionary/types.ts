export type DictionaryEntry = {
  id: string;
  primary_spelling: string | null;
  primary_reading: string;
  spellings: string[];
  readings: string[];
  glosses: string[];
  glosses_ko: string[];
  parts_of_speech: string[];
  is_common: boolean;
};
