
import { GoogleGenAI } from "@google/genai";

// Always initialize with direct process.env.API_KEY access
// Initialize lazily to prevent crash if key is missing on load
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("Gemini API Key missing! AI features will be disabled.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateJobDescription = async (workType: string, location: string): Promise<string> => {
  try {
    const ai = getAIClient();
    if (!ai) return "AI unavailable (Key missing).";

    // Using gemini-3-flash-preview for basic text tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Write a short, inviting, and clear job description (max 30 words) for an agricultural job. 
      Work Type: ${workType}. 
      Location: ${location}. 
      Target audience: Local farm workers.`,
    });
    // Accessing .text as a property
    const txt = response.text;
    return typeof txt === 'function' ? txt() : (txt || "No description generated.");
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Could not generate description automatically.";
  }
};

export const suggestEquipmentMaintenance = async (equipmentName: string): Promise<string> => {
  try {
    const ai = getAIClient();
    if (!ai) return "AI unavailable (Key missing).";

    // Using gemini-3-flash-preview for maintenance tips
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide 3 short, bulleted maintenance tips for a farming ${equipmentName}. Keep it under 50 words total.`
    });
    // Accessing .text as a property
    const txt = response.text;
    return typeof txt === 'function' ? txt() : (txt || "No tips available.");
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Maintenance tips unavailable.";
  }
}
