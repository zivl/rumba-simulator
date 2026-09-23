/** Thermal class used by infrared vision to colour objects. */
export type Thermal = 'frozen' | 'cold' | 'neutral' | 'warm' | 'hot';

export type MaterialKey =
  | 'woodLight'
  | 'woodMid'
  | 'woodDark'
  | 'fabricGrey'
  | 'fabricBlue'
  | 'fabricGreen'
  | 'fabricBeige'
  | 'fabricRed'
  | 'fabricLight'
  | 'leather'
  | 'metal'
  | 'chrome'
  | 'white'
  | 'cabinet'
  | 'ceramic'
  | 'counterTop'
  | 'black'
  | 'screen'
  | 'glass'
  | 'plantLeaf'
  | 'terracotta'
  | 'mattress'
  | 'pillow'
  | 'blanketBlue'
  | 'blanketPink'
  | 'blanketGreen'
  | 'bookRed'
  | 'bookBlue'
  | 'bookGreen'
  | 'bookYellow'
  | 'toyRed'
  | 'toyBlue'
  | 'toyYellow'
  | 'toyGreen'
  | 'yarnRed'
  | 'dustGrey'
  | 'bone'
  | 'mudBrown'
  | 'dogBedBrown'
  | 'rubber'
  | 'fridge'
  | 'stoveTop'
  | 'burner'
  | 'lampShade'
  | 'mirror'
  | 'rugRed'
  | 'rugBlue'
  | 'rugBeige'
  | 'rugGreen'
  | 'water';

export interface MaterialDefinition {
  color: string;
  roughness: number;
  metalness: number;
  emissive?: string;
  emissiveIntensity?: number;
  opacity?: number;
  thermal: Thermal;
}

export const MATERIALS: Record<MaterialKey, MaterialDefinition> = {
  woodLight: { color: '#c9a27a', roughness: 0.6, metalness: 0, thermal: 'neutral' },
  woodMid: { color: '#8b5e3c', roughness: 0.55, metalness: 0, thermal: 'neutral' },
  woodDark: { color: '#4e3424', roughness: 0.5, metalness: 0, thermal: 'neutral' },
  fabricGrey: { color: '#6f7479', roughness: 0.95, metalness: 0, thermal: 'neutral' },
  fabricBlue: { color: '#3d5a80', roughness: 0.95, metalness: 0, thermal: 'neutral' },
  fabricGreen: { color: '#52796f', roughness: 0.95, metalness: 0, thermal: 'neutral' },
  fabricBeige: { color: '#c8b89a', roughness: 0.95, metalness: 0, thermal: 'neutral' },
  fabricRed: { color: '#9d3c3c', roughness: 0.95, metalness: 0, thermal: 'neutral' },
  fabricLight: { color: '#e4ddd0', roughness: 0.95, metalness: 0, thermal: 'neutral' },
  leather: { color: '#5b3a29', roughness: 0.45, metalness: 0, thermal: 'neutral' },
  metal: { color: '#8d939b', roughness: 0.35, metalness: 0.8, thermal: 'cold' },
  chrome: { color: '#d7dbe0', roughness: 0.15, metalness: 1, thermal: 'cold' },
  white: { color: '#f2f2f0', roughness: 0.5, metalness: 0, thermal: 'neutral' },
  cabinet: { color: '#e8e4dc', roughness: 0.45, metalness: 0, thermal: 'neutral' },
  ceramic: { color: '#f7f9fb', roughness: 0.2, metalness: 0, thermal: 'cold' },
  counterTop: { color: '#3b3f45', roughness: 0.25, metalness: 0.1, thermal: 'cold' },
  black: { color: '#1b1c1f', roughness: 0.4, metalness: 0.2, thermal: 'neutral' },
  screen: { color: '#0d1b2a', roughness: 0.1, metalness: 0.3, emissive: '#1d3557', emissiveIntensity: 0.6, thermal: 'warm' },
  glass: { color: '#9ec9d9', roughness: 0.05, metalness: 0.1, opacity: 0.45, thermal: 'cold' },
  plantLeaf: { color: '#3f7d3a', roughness: 0.8, metalness: 0, thermal: 'neutral' },
  terracotta: { color: '#b5543c', roughness: 0.85, metalness: 0, thermal: 'neutral' },
  mattress: { color: '#f4f1ea', roughness: 0.9, metalness: 0, thermal: 'neutral' },
  pillow: { color: '#fbfaf7', roughness: 0.95, metalness: 0, thermal: 'neutral' },
  blanketBlue: { color: '#5c7aa6', roughness: 0.95, metalness: 0, thermal: 'neutral' },
  blanketPink: { color: '#d88c9a', roughness: 0.95, metalness: 0, thermal: 'neutral' },
  blanketGreen: { color: '#7fa37a', roughness: 0.95, metalness: 0, thermal: 'neutral' },
  bookRed: { color: '#a23b3b', roughness: 0.8, metalness: 0, thermal: 'neutral' },
  bookBlue: { color: '#2b4c7e', roughness: 0.8, metalness: 0, thermal: 'neutral' },
  bookGreen: { color: '#3e6b48', roughness: 0.8, metalness: 0, thermal: 'neutral' },
  bookYellow: { color: '#d4a82a', roughness: 0.8, metalness: 0, thermal: 'neutral' },
  toyRed: { color: '#e63946', roughness: 0.4, metalness: 0, thermal: 'neutral' },
  toyBlue: { color: '#1d7bd8', roughness: 0.4, metalness: 0, thermal: 'neutral' },
  toyYellow: { color: '#ffc300', roughness: 0.4, metalness: 0, thermal: 'neutral' },
  toyGreen: { color: '#2a9d8f', roughness: 0.4, metalness: 0, thermal: 'neutral' },
  yarnRed: { color: '#d62839', roughness: 1, metalness: 0, thermal: 'neutral' },
  dustGrey: { color: '#a8a39a', roughness: 1, metalness: 0, thermal: 'neutral' },
  bone: { color: '#f1ead8', roughness: 0.7, metalness: 0, thermal: 'neutral' },
  mudBrown: { color: '#4b3218', roughness: 0.9, metalness: 0, thermal: 'neutral' },
  dogBedBrown: { color: '#7a4f2f', roughness: 1, metalness: 0, thermal: 'warm' },
  rubber: { color: '#2d2d2d', roughness: 0.9, metalness: 0, thermal: 'neutral' },
  fridge: { color: '#e9edf0', roughness: 0.3, metalness: 0.3, thermal: 'frozen' },
  stoveTop: { color: '#1f2226', roughness: 0.2, metalness: 0.4, thermal: 'warm' },
  burner: { color: '#3a3a3a', roughness: 0.6, metalness: 0.5, emissive: '#ff4500', emissiveIntensity: 0.15, thermal: 'hot' },
  lampShade: { color: '#f5e6c8', roughness: 0.9, metalness: 0, emissive: '#ffd79a', emissiveIntensity: 0.35, thermal: 'hot' },
  mirror: { color: '#cfe3ea', roughness: 0.02, metalness: 1, thermal: 'cold' },
  rugRed: { color: '#8e3b46', roughness: 1, metalness: 0, thermal: 'neutral' },
  rugBlue: { color: '#34506b', roughness: 1, metalness: 0, thermal: 'neutral' },
  rugBeige: { color: '#bba98a', roughness: 1, metalness: 0, thermal: 'neutral' },
  rugGreen: { color: '#4f6d5a', roughness: 1, metalness: 0, thermal: 'neutral' },
  water: { color: '#7fb8d6', roughness: 0.05, metalness: 0.1, opacity: 0.7, thermal: 'cold' },
};

/** Infrared palette (index = hotter). */
export const THERMAL_COLORS: Record<Thermal, string> = {
  frozen: '#1b0b5a',
  cold: '#24317a',
  neutral: '#3a2c7a',
  warm: '#c2377a',
  hot: '#ffb347',
};

export const INFRARED_COLORS = {
  background: '#05020f',
  floor: '#140a33',
  wall: '#2a1f66',
  dirt: '#fff38a',
  dirtHot: '#ffffff',
  boss: '#ff5a1f',
  roomba: '#5cf2ff',
  station: '#7dff8a',
} as const;
