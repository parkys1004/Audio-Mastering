import { GoogleGenAI, Type } from "@google/genai";
import { MasteringParams } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateMasteringParams = async (description: string): Promise<MasteringParams> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate audio mastering parameters based on this description: "${description}"`,
      config: {
        systemInstruction: `You are a world-class Audio Mastering Engineer. 
        Your task is to translate the user's subjective description of a sound (e.g., "warm and punchy", "clear and wide", "lo-fi radio") into specific, technical mastering parameters.
        
        Guidelines:
        - EQ Gains: Range -12dB to +12dB.
        - Compressor Threshold: -60dB to 0dB.
        - Compressor Ratio: 1:1 to 20:1.
        - Compressor Attack: 0.001s to 0.1s.
        - Compressor Release: 0.01s to 1.0s.
        - Stereo Width: 0.0 (mono) to 2.0 (super wide). Normal is 1.0.

        Analyze the keywords:
        - "Punchy" usually means slower attack (10-30ms), higher ratio (4-8), and bass boost.
        - "Warm" usually means low-mid boost (200-500Hz) and slight high shelf cut or tape saturation emulation (not directly available here, but simulate with EQ).
        - "Airy" or "Bright" means High Shelf boost.
        - "Glue" means gentle compression (low ratio 2:1, low threshold).
        `,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            eq: {
              type: Type.OBJECT,
              properties: {
                lowGain: { type: Type.NUMBER, description: "Low Shelf Filter (100Hz) Gain in dB" },
                midGain: { type: Type.NUMBER, description: "Peaking Filter (1kHz) Gain in dB" },
                highGain: { type: Type.NUMBER, description: "High Shelf Filter (10kHz) Gain in dB" },
              },
              required: ["lowGain", "midGain", "highGain"],
            },
            compressor: {
              type: Type.OBJECT,
              properties: {
                threshold: { type: Type.NUMBER, description: "Threshold in dB" },
                ratio: { type: Type.NUMBER, description: "Compression Ratio" },
                attack: { type: Type.NUMBER, description: "Attack time in seconds" },
                release: { type: Type.NUMBER, description: "Release time in seconds" },
              },
              required: ["threshold", "ratio", "attack", "release"],
            },
            stereoWidth: { type: Type.NUMBER, description: "Stereo Width factor (0.0 to 2.0)" },
          },
          required: ["eq", "compressor", "stereoWidth"],
        },
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("No response from AI");
    }

    const params = JSON.parse(jsonText) as MasteringParams;
    return params;

  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
};
