// Placeholder lists for AI name generation.
// IMPORTANT: Replace these placeholders with your desired terms.
// Using offensive terms is against safety guidelines.

export const GAY_NOUNS = [
  'MuscleCub','PowerBottom','Otter','LeatherDaddy','GymBunny',
  'DiscoTwink','CircuitQueen','PupHandler','BearHugger','StoneButch',
  'SteamRoomDoc','PrideDiva','LubeLord','LockerLegend','SaunaScout',
  'FlexFiend','ThiccIcon','GluteGuru','JockstrapJester','RainbowRogue',
  'ChestChamp','ThirstTrap','ShowerSiren','KinkKnight','SquatSquire',
  'BeefcakeBaron','TwerkTroll','GogoGoblin','TugBoat','GlitterGhoul'
] as const;

export const GAY_VERBS = [
  'Pounder','Pleaser','Rimmer','Grinder','Stroker',
  'Slurper','Sniffer','Worshiper','Luster','Explorer',
  'Teaser','Taster','Wrestler','Nibbler','Hunter',
  'Chaser','Churner','Milker','Thruster','Squeezer',
  'Nuzzler','Hugger','Tugger','Licker','Sucker',
  'Digger','Diver','Rider','Peeper','Muncher'
] as const;

/**
 * Generates a random AI name by combining a term and a verb.
 * @returns A randomly generated name string.
 */
export function generateAiName(): string {
    // Use the correct array names GAY_NOUNS and GAY_VERBS
    const randomTerm = GAY_NOUNS[Math.floor(Math.random() * GAY_NOUNS.length)];
    const randomVerb = GAY_VERBS[Math.floor(Math.random() * GAY_VERBS.length)];
    return `${randomTerm} ${randomVerb}`;
}
