"""
AI Action Tracker and Meeting Synthesizer

This module provides functionality to analyze meeting transcripts and extract
actions, decisions, and blockers using the defined system prompt.
"""

import json
from typing import Dict, List, Any
from system_prompt import SYSTEM_PROMPT


# JSON Schema for the output
ACTION_TRACKER_SCHEMA = {
    "type": "object",
    "properties": {
        "actions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "description": {"type": "string"},
                    "owner": {"type": "string"},
                    "intent": {
                        "type": "string",
                        "enum": ["ACTION", "DECISION", "BLOCKER"]
                    },
                    "confidence": {
                        "type": "string",
                        "enum": ["HIGH", "MEDIUM", "LOW"]
                    },
                    "due_date": {"type": ["string", "null"]},
                    "context": {"type": "string"},
                    "source_line": {"type": "string"}
                },
                "required": ["id", "description", "owner", "intent", "confidence"]
            }
        },
        "summary": {
            "type": "object",
            "properties": {
                "total_actions": {"type": "integer"},
                "total_decisions": {"type": "integer"},
                "total_blockers": {"type": "integer"},
                "unassigned_actions": {"type": "integer"}
            }
        }
    },
    "required": ["actions", "summary"]
}


def get_system_prompt() -> str:
    """Returns the system prompt for the AI Action Tracker."""
    return SYSTEM_PROMPT


def get_json_schema() -> Dict[str, Any]:
    """Returns the JSON schema for the action tracker output."""
    return ACTION_TRACKER_SCHEMA


def validate_output(output: Dict[str, Any]) -> bool:
    """
    Validates that the output conforms to the JSON schema.
    
    Args:
        output: The JSON object to validate
        
    Returns:
        True if valid, False otherwise
    """
    # Basic validation - in production, use jsonschema library
    if not isinstance(output, dict):
        return False
    
    if "actions" not in output or "summary" not in output:
        return False
    
    if not isinstance(output["actions"], list):
        return False
    
    if not isinstance(output["summary"], dict):
        return False
    
    # Validate each action
    for action in output["actions"]:
        required_fields = ["id", "description", "owner", "intent", "confidence"]
        if not all(field in action for field in required_fields):
            return False
        
        if action["intent"] not in ["ACTION", "DECISION", "BLOCKER"]:
            return False
        
        if action["confidence"] not in ["HIGH", "MEDIUM", "LOW"]:
            return False
    
    return True


def format_prompt_with_transcript(transcript: str) -> str:
    """
    Formats the system prompt with the transcript for API calls.
    
    Args:
        transcript: The raw meeting transcript text
        
    Returns:
        Formatted prompt string
    """
    return f"""{SYSTEM_PROMPT}

### JSON Schema:
{json.dumps(ACTION_TRACKER_SCHEMA, indent=2)}

### Raw Meeting Transcript:
{transcript}

### Instructions:
Analyze the transcript above and output ONLY a valid JSON object matching the schema.
Do not include any markdown formatting, explanations, or text outside the JSON object.
"""


if __name__ == "__main__":
    # Example usage
    print("AI Action Tracker System Prompt:")
    print("=" * 50)
    print(get_system_prompt())
    print("\n" + "=" * 50)
    print("\nJSON Schema:")
    print(json.dumps(get_json_schema(), indent=2))

