import os
import re
import json
import logging
from typing import Dict, Any, List, Optional
from backend.app.config import settings
from backend.app.schemas.video import AIMetadataResponse

logger = logging.getLogger("ai_metadata")

class AIMetadataGenerator:
    def __init__(self):
        pass

    def generate_with_gemini(self, title: str, subreddit: str, author: str, context_text: str = "") -> AIMetadataResponse:
        from google import genai
        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        prompt = f"""
You are an elite short-form content strategist who specializes in generating viral YouTube Shorts, TikToks, and Instagram Reels with millions of views.

Analyze this original Reddit post:
Original Title: "{title}"
Subreddit: r/{subreddit}
Original Author: u/{author}
Additional Context: {context_text[:500]}

Generate high-retention metadata:
1. "viral_titles": List of 3 irresistible, click-worthy titles utilizing psychological curiosity gaps, urgency, or shock (include 1-2 relevant emojis).
2. "selected_title": The absolute highest converting title of the 3.
3. "description": An SEO-optimized description with an engaging opening line, a compelling call-to-action (CTA), and proper credit to the original Reddit creator.
4. "hashtags": Array of 15-20 trending hashtags (including #Shorts, #viral, #trending, #reels, #explore).
5. "hook_rating": An integer viral score between 88 and 99.
6. "suggested_sound_category": Recommendation for background music vibe (e.g. "Suspense / Sudden Drop", "High Energy Phonk", "Emotional Ambient").

Return ONLY valid JSON matching this schema:
{{
  "viral_titles": ["...", "...", "..."],
  "selected_title": "...",
  "description": "...",
  "hashtags": ["#Shorts", "#viral", ...],
  "hook_rating": 96,
  "suggested_sound_category": "..."
}}
"""
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )
        text = response.text or ""
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            data = json.loads(match.group(0))
            return AIMetadataResponse(**data)
        raise ValueError("Could not parse JSON from Gemini")

    def generate_with_openai(self, title: str, subreddit: str, author: str, context_text: str = "") -> AIMetadataResponse:
        from openai import OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY)

        prompt = f"""
You are a viral YouTube Shorts and Instagram Reels growth strategist.
Generate viral metadata for this video:
Original Title: "{title}"
Subreddit: r/{subreddit}
Credit: u/{author}

Respond strictly in JSON format with:
- "viral_titles": list of 3 viral titles with hooks
- "selected_title": best title
- "description": SEO description with CTA and credit
- "hashtags": array of 15 top hashtags
- "hook_rating": integer 88-98
- "suggested_sound_category": string
"""
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": "You output only valid JSON metadata for viral videos."},
                {"role": "user", "content": prompt}
            ]
        )
        data = json.loads(completion.choices[0].message.content)
        return AIMetadataResponse(**data)

    def generate_heuristic_fallback(self, title: str, subreddit: str, author: str) -> AIMetadataResponse:
        """Smart algorithmic template generator when no API keys are provided."""
        clean_title = re.sub(r'[^\w\s]', '', title).strip()
        words = clean_title.split()
        core_phrase = " ".join(words[:5]) if words else "Unbelievable Moment"

        title_options = [
            f"Wait till the end of this... 😱 ({core_phrase})",
            f"Nobody expected this to happen! 🤯 #{subreddit}",
            f"Is this actually real?! 🔥 ({core_phrase})"
        ]

        hashtags = [
            "#Shorts", "#viral", "#trending", "#reels", "#fyp",
            "#explorepage", "#redditstories", f"#{subreddit.lower()}",
            "#viralvideo", "#foryou", "#omg", "#insane", "#reaction",
            "#tiktokviral", "#youtubecreators"
        ]

        description = (
            f"You won't believe what just happened here! 🤯 Drop a like if this took you by surprise.\n\n"
            f"📌 Credit: u/{author} from r/{subreddit}\n"
            f"🔔 Subscribe to @ClipNova for the daily top viral clips and moments!\n\n"
            f"{' '.join(hashtags[:8])}"
        )

        return AIMetadataResponse(
            viral_titles=title_options,
            selected_title=title_options[0],
            description=description,
            hashtags=hashtags,
            hook_rating=94,
            suggested_sound_category="Trending Suspense / High Energy"
        )

    def generate_metadata(self, title: str, subreddit: str = "Reddit", author: str = "Reddit User", context_text: str = "") -> AIMetadataResponse:
        try:
            if settings.GEMINI_API_KEY:
                logger.info("Generating AI metadata using Gemini...")
                return self.generate_with_gemini(title, subreddit, author, context_text)
            elif settings.OPENAI_API_KEY:
                logger.info("Generating AI metadata using OpenAI...")
                return self.generate_with_openai(title, subreddit, author, context_text)
        except Exception as e:
            logger.warning(f"AI metadata generation error ({e}), falling back to heuristic engine.")

        return self.generate_heuristic_fallback(title, subreddit, author)

ai_metadata_generator = AIMetadataGenerator()
