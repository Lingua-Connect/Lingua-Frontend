
import { MODEL_CONFIG } from './config';
import { recordAudio, useWebSpeechAPI } from './audio-utils';

/**
 * Convert speech to text using appropriate ASR service based on language
 */
export const speechToText = async (language: string): Promise<string> => {
  console.log(`Starting speech recognition for ${language}`);
  
  // Use Google's Web Speech API or Google Cloud Speech-to-Text API for English
  if (language === 'en') {
    console.log(MODEL_CONFIG.asr.en.apiKey.length);
    // If Google Cloud API key is available and valid, use Google Cloud Speech-to-Text
    if (MODEL_CONFIG.asr.en?.apiKey && MODEL_CONFIG.asr.en.apiKey.length > 10) {
      return new Promise(async (resolve, reject) => {
        try {
          // Record audio first
          const audioBlob = await recordAudio();
          
          // Convert audio blob to base64
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          
          reader.onloadend = async () => {
            const base64Audio = reader.result?.toString().split(',')[1];

            if (!base64Audio) {
              reject(new Error('Failed to convert audio to base64'));
              return;
            }
            
            try {
              // Call Google Cloud Speech-to-Text API
              const response = await fetch('https://speech.googleapis.com/v1/speech:recognize', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${MODEL_CONFIG.asr.en?.apiKey}`,
                },
                body: JSON.stringify({
                  config: {
                    encoding: 'LINEAR16',
                    sampleRateHertz: 16000,
                    languageCode: 'en-US',
                  },
                  audio: {
                    content: base64Audio,
                  },
                }),
              });
              
              const data = await response.json();
              
              if (data.error) {
                throw new Error(data.error.message || 'Google Speech API error');
              }
              
              if (data.results && data.results.length > 0) {
                const transcript = data.results[0].alternatives[0].transcript;
                resolve(transcript);
              } else {
                reject(new Error('No speech detected'));
              }
            } catch (error) {
              console.error('Google Cloud Speech API error:', error);
              // Fall back to Web Speech API
              const webSpeechResult = await useWebSpeechAPI('en-US');
              resolve(webSpeechResult);
            }
          };
        } catch (error) {
          console.error('Speech recognition error:', error);
          reject(error);
        }
      });
    } else {
      // Fall back to Web Speech API
      return useWebSpeechAPI('en-US');
    }
  } 
  // For Giriama, use the custom ASR endpoint
  else if (language === 'gir') {
    return new Promise(async (resolve, reject) => {
      try {
        // Record audio
        const audioBlob = await recordAudio();
        // Convert audio blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        
        reader.onloadend = async () => {
          const base64Audio = reader.result?.toString().split(',')[1];

          if (!base64Audio) {
            throw new Error('Failed to convert audio to base64');
            
          };
          try {
            const response = await fetch(MODEL_CONFIG.asr.gir["url"], {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${MODEL_CONFIG.asr.gir["apiKey"]}`,
              },
              body: JSON.stringify({
                input: {
                  audio_data: base64Audio,
                },
              }),
            });
            
            if (!response.ok) {
              throw new Error(`Giriama ASR API responded with status: ${response.status}`);
            }

            const data = await response.json();
            if (data.output.transcription){
              const transcript = data.output.transcription;
              resolve(transcript);
            }
            else{
              reject(new Error("No speech detected"));
            }
          } catch (error) {
            console.error("Giriama ASR API error:", error);
          }
          
        }
        
      } catch (error) {
        console.error("Giriama speech recognition error:", error);
        
        // For development, return a mock result
        return "Mimi ni mkulima wa mahindi";
    }})
  } else {
    throw new Error(`Speech recognition not supported for ${language}`);
  }
};
