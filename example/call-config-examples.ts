// Prompts similar to the default prompts used on the backend. 

// Yes/no question scored against each user line. At 0.5 or above the line is an action request.
// Write a question about the message, not an instruction: the classifier returns the
// probability that the answer is yes.
export const DEFAULT_ACTION_DETECTOR_PROMPT =
  "Does the user's latest message ask the assistant to perform an action or emotion beyond replying in chat?";

// Director system prompt. This is the system-prompt for the LLM that describes the action based on the user's input.
 // The description it generates is cut at 800 characters.
export const DEFAULT_DIRECTOR_PROMPT = `Turn the action request into a prompt for a video model. The prompt renders a short clip of the character, starting from a still of them talking to the camera.

Rules for the prompt:
- Third person, present tense. Only what the camera sees.
- One to three physical beats. No dialogue, no speech, no thoughts, no sound effects.
- The last beat has the character settle back into the original pose.
- If the viewer takes part, only a plain, gender-neutral hand and wrist may reach in from the edge of the frame.

duration: 3 for a very simple gesture, 6.4 for one full beat, 10 for longer actions (dancing, moving around, changing outfits, complicated movements).
event: 4-10 words, third person, present tense, starting with their name, or their pronoun if they have none; say "the camera" rather than "you", e.g. "She blows a kiss at the camera".
audio: true only when sound is core to the action (dancing, drumming, clapping, singing). Never for talking; speech is never generated. Otherwise false.
`;

// Appended to every action description. Used to provide consistent guidance across all actions.
// Cut at 800 characters. Description + suffix is cut at 1,600.
export const DEFAULT_ACTION_DESCRIPTION_SUFFIX =
  "The first and last frames are exactly the reference image. " +
  "Keep the face, hair, outfit, body, art style, and " +
  "background consistent. Smooth, natural, continuous motion with no cuts. Audio: no " +
  "music, no talking, no dialogue, no background ambience. Only incidental sounds from " +
  "the physical action itself; do not add laughter, giggling, or other vocalizations " +
  "unless the action description above explicitly calls for them (sigh, groan, etc.). " +
  "Never make any sounds at the start or end of the clip. Never say any words. ";
