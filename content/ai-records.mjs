export const generatedOn = "2026-10-16";

export const aiRecords = [
  ["ai-f-cat", "foundations", "easy", "animal", "A photorealistic tabby cat sitting on a sunlit wooden windowsill, soft morning light, shallow depth of field, quiet apartment background, natural fur detail."],
  ["ai-f-ramen", "foundations", "easy", "food", "Overhead photograph of a bowl of ramen with a soft egg, scallions, and glossy broth on a wooden restaurant table, natural daylight, realistic food photography."],
  ["ai-f-bicycle", "foundations", "easy", "object", "A red city bicycle leaning against a weathered brick wall on an overcast day, documentary photograph, damp pavement, no people."],
  ["ai-f-bench", "foundations", "medium", "place", "An empty wooden park bench beneath trees with orange autumn leaves, fallen leaves on the path, soft afternoon light, realistic photograph."],
  ["ai-f-mug", "foundations", "medium", "object", "A speckled ceramic coffee mug on a wooden desk beside a closed blank notebook, morning window light, photorealistic still life."],
  ["ai-c-keyboard", "code", "easy", "technology", "Close photograph of a mechanical keyboard with blank dark keycaps, warm desk lamp, realistic plastic and metal texture, shallow depth of field."],
  ["ai-c-duck", "code", "easy", "object", "A yellow rubber duck sitting on the lid of a closed silver laptop, soft daylight, tidy wooden desk, photorealistic still life."],
  ["ai-c-server", "code", "medium", "technology", "A long aisle inside a data-center server room, rows of equipment racks with small status lights, cool blue ambient light, photorealistic, plain unlabeled bezels."],
  ["ai-a-robot", "ai", "medium", "technology", "A photorealistic industrial robot arm in a bright factory, painted safety yellow, holding a small metal part above a workbench, documentary lighting, no readable labels."],
  ["ai-a-drone", "ai", "medium", "technology", "A small quadcopter drone hovering above a green wheat field, late afternoon sun, realistic photograph from a low angle, open sky."],
  ["ai-a-car", "ai", "hard", "object", "A plain silver sedan driving away on a wet two-lane road at dusk, taillights glowing, pine trees on both sides, photorealistic, no badges or readable plates."],
  ["ai-y-padlock", "cyber", "medium", "object", "A close-up photograph of a brass padlock fastened through a steel hasp on a weathered wooden door, daylight, sharp metal detail, photorealistic."],
  ["ai-y-fiber", "cyber", "hard", "technology", "A bundle of fiber-optic strands glowing cyan and amber in a dark equipment room, shallow depth of field, photorealistic, no readable labels."],
  ["ai-y-street", "cyber", "hard", "place", "An empty wet city street at night after rain, warm shop light reflecting on the pavement, photorealistic, plain unlettered storefronts."],
  ["ai-m-fruit", "mix", "easy", "food", "A ceramic bowl of red apples, yellow pears, and green grapes on a linen table, soft window light, photorealistic still life."],
  ["ai-m-lake", "mix", "medium", "landscape", "A calm mountain lake reflecting pine trees and a rocky peak, early morning mist, photorealistic landscape with no people."],
  ["ai-m-dog", "mix", "hard", "animal", "A golden retriever standing in a sunlit grassy meadow, looking toward the camera, natural fur, photorealistic, shallow depth of field."],
].map(([assetId, setId, difficulty, subject, prompt]) => ({ assetId, setId, difficulty, subject, prompt }));
