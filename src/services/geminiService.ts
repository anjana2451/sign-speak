import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const translateText = async (text: string, targetLang: 'ml' | 'en') => {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `Translate the following text to ${targetLang === 'ml' ? 'Malayalam' : 'English'}: "${text}". Return only the translated text.`,
  });
  return response.text ?? '';
};

export const generateSentence = async (words: string[]) => {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `Convert the following sequence of recognized sign language words into a natural-sounding English sentence: "${words.join(', ')}". Return only the sentence.`,
  });
  return response.text ?? '';
};
