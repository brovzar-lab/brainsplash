export const isDemoMode =
  process.env.DEMO_MODE === 'true' ||
  !process.env.EXPO_PUBLIC_FIREBASE_API_KEY ||
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY === 'REPLACE_WITH_VALUE' ||
  !process.env.EXPO_PUBLIC_OPENAI_API_KEY ||
  process.env.EXPO_PUBLIC_OPENAI_API_KEY === 'REPLACE_WITH_VALUE' ||
  !process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ||
  process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY === 'REPLACE_WITH_VALUE';
