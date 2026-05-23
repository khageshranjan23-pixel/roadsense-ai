# RoadSense AI — Gemini Service

import os
import json
import re
from typing import Dict, Any, List, Generator
import google.generativeai as genai

class GeminiService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "")
        if self.api_key:
            genai.configure(api_key=self.api_key)
        self.model_name = "gemini-2.0-flash"

    def generate_json(self, prompt: str) -> Dict[str, Any]:
        """
        Requests structured JSON from Gemini 2.0 Flash.
        """
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not set in the environment variables.")
            
        model = genai.GenerativeModel(self.model_name)
        generation_config = {"response_mime_type": "application/json"}
        
        response = model.generate_content(prompt, generation_config=generation_config)
        
        try:
            return json.loads(response.text)
        except Exception as e:
            # Fallback regex parsing in case it returned some markdown wrapper
            match = re.search(r'(\{.*\})', response.text, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(1))
                except:
                    pass
            raise ValueError(f"Failed to parse Gemini response as JSON: {response.text}") from e

    def chat_stream(
        self, 
        system_instruction: str, 
        prompt: str, 
        conversation_history: List[Dict[str, Any]] = None
    ) -> Generator[str, None, None]:
        """
        Streams chat responses from Gemini 2.0 Flash.
        """
        if not self.api_key:
            yield "VERDICT: CAUTION\nREASON: Gemini API key is not configured on the backend.\nADVICE: Please configure your GEMINI_API_KEY in the environment variables."
            return
            
        model = genai.GenerativeModel(
            model_name=self.model_name,
            system_instruction=system_instruction
        )
        
        # Build contents from history
        contents = []
        if conversation_history:
            for msg in conversation_history:
                # Map standard roles to Gemini roles
                role = "user" if msg.get("role") == "user" else "model"
                contents.append({
                    "role": role,
                    "parts": [msg.get("content", "")]
                })
                
        contents.append({
            "role": "user",
            "parts": [prompt]
        })
        
        response = model.generate_content(contents, stream=True)
        for chunk in response:
            if chunk.text:
                yield chunk.text
                
    def mock_chat_stream(self, system_instruction: str, prompt: str) -> Generator[str, None, None]:
        """
        Mock chat stream for tests/fallback.
        """
        import time
        response_text = "VERDICT: SAFE\nREASON: The road appears clear with no vehicles within 200 pixels and pedestrians have successfully completed crossing.\nADVICE: You can cross now, but always look left and right before stepping onto the street."
        for word in response_text.split(" "):
            yield word + " "
            time.sleep(0.05)
