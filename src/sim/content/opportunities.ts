import type { LocationId, Medium, Skill } from '../types';

export interface OpportunityTemplate {
  id: string;
  medium: Medium;
  skill: Skill;
  tier: number;
  title: string;
  location: LocationId;
}

export const OPPORTUNITY_TEMPLATES: readonly OpportunityTemplate[] = [
  // Tier 1: unpaid, unseen, unbothered.
  { id: 't1-film-acting', medium: 'film', skill: 'acting', tier: 1, title: 'Background Mourner in a Student Short About Grief', location: 'silverlake' },
  { id: 't1-film-writing', medium: 'film', skill: 'writing', tier: 1, title: 'Punch Up a Film School Short, Paid in Exposure', location: 'noho' },
  { id: 't1-film-directing', medium: 'film', skill: 'directing', tier: 1, title: 'Direct a 48-Hour Film Fest Entry, Zero Budget', location: 'noho' },
  { id: 't1-tv-acting', medium: 'tv', skill: 'acting', tier: 1, title: "Background Juror on 'Crime Scene: Van Nuys'", location: 'burbank' },
  { id: 't1-tv-writing', medium: 'tv', skill: 'writing', tier: 1, title: 'Write a Spec Pilot Nobody Asked For', location: 'hollywood' },
  { id: 't1-music-music', medium: 'music', skill: 'music', tier: 1, title: 'Open Mic at The Cracked Mug, Slot #37', location: 'silverlake' },
  { id: 't1-music-directing', medium: 'music', skill: 'directing', tier: 1, title: "Shoot a Lyric Video for Your Roommate's Band", location: 'noho' },
  { id: 't1-tv-music', medium: 'tv', skill: 'music', tier: 1, title: 'Hold Music for a Public Access Cooking Show', location: 'burbank' },
  { id: 't1-film-music', medium: 'film', skill: 'music', tier: 1, title: 'Score a Student Short on a Free Trial DAW', location: 'santamonica' },

  // Tier 2: one line, one slot, one parking ticket.
  { id: 't2-film-acting', medium: 'film', skill: 'acting', tier: 2, title: 'Day Player in a Mumblecore Indie. Your Line: "Huh."', location: 'silverlake' },
  { id: 't2-film-writing', medium: 'film', skill: 'writing', tier: 2, title: 'Uncredited Rewrite of a Horror Short About a Lamp', location: 'noho' },
  { id: 't2-film-directing', medium: 'film', skill: 'directing', tier: 2, title: 'Second Unit on a Crowdfunded Zombie Feature', location: 'santamonica' },
  { id: 't2-tv-acting', medium: 'tv', skill: 'acting', tier: 2, title: 'Co-Star, One Line: "He Went That Way, Officer"', location: 'burbank' },
  { id: 't2-tv-writing', medium: 'tv', skill: 'writing', tier: 2, title: "Writers' PA on 'Cul-de-Sac Cops' (Lunch Orders)", location: 'burbank' },
  { id: 't2-music-music', medium: 'music', skill: 'music', tier: 2, title: 'Opening Slot at The Whiskey Wobble, 7:15 PM Sharp', location: 'weho' },
  { id: 't2-music-directing', medium: 'music', skill: 'directing', tier: 2, title: 'Direct a Music Video in a Laundromat at 3 AM', location: 'noho' },
  { id: 't2-tv-music', medium: 'tv', skill: 'music', tier: 2, title: 'Jingle for a Late-Night Mattress Commercial', location: 'burbank' },
  { id: 't2-film-music', medium: 'film', skill: 'music', tier: 2, title: 'Temp Score for a Festival Short (Will Be Replaced)', location: 'hollywood' },

  // Tier 3: supporting roles, micro-budgets, rooms with pizza.
  { id: 't3-film-acting', medium: 'film', skill: 'acting', tier: 3, title: 'Supporting Role in a Sundown Fest Darling', location: 'silverlake' },
  { id: 't3-film-writing', medium: 'film', skill: 'writing', tier: 3, title: 'Write a Micro-Budget Thriller Set in One Room', location: 'noho' },
  { id: 't3-film-directing', medium: 'film', skill: 'directing', tier: 3, title: 'Direct a Micro-Budget Short Shot Entirely on a Phone', location: 'silverlake' },
  { id: 't3-tv-acting', medium: 'tv', skill: 'acting', tier: 3, title: 'Recurring Barista on a Hulo Dramedy', location: 'burbank' },
  { id: 't3-tv-writing', medium: 'tv', skill: 'writing', tier: 3, title: "Staff a Web-Series Writers' Room (Paid in Pizza)", location: 'hollywood' },
  { id: 't3-music-music', medium: 'music', skill: 'music', tier: 3, title: 'Session Work on a Bedroom-Pop EP, Two Takes Max', location: 'silverlake' },
  { id: 't3-music-directing', medium: 'music', skill: 'directing', tier: 3, title: 'Direct a Music Video for a Moody Synthwave Duo', location: 'hollywood' },
  { id: 't3-tv-music', medium: 'tv', skill: 'music', tier: 3, title: 'Song Under the Chatter in a Streamflix Bar Scene', location: 'burbank' },
  { id: 't3-film-music', medium: 'film', skill: 'music', tier: 3, title: 'Score a Micro-Budget Horror With One Synth', location: 'noho' },

  // Tier 4: people have started saying "I've seen you in something."
  { id: 't4-film-acting', medium: 'film', skill: 'acting', tier: 4, title: "The Best Friend in a Rom-Com Nobody's Seen Yet", location: 'santamonica' },
  { id: 't4-film-writing', medium: 'film', skill: 'writing', tier: 4, title: 'Polish a Rom-Com. Note: "Make It Pop, But Quieter"', location: 'santamonica' },
  { id: 't4-film-directing', medium: 'film', skill: 'directing', tier: 4, title: 'Direct a Proof-of-Concept Short for a Feature Pitch', location: 'hollywood' },
  { id: 't4-tv-acting', medium: 'tv', skill: 'acting', tier: 4, title: 'Two-Episode Arc as Suspicious Neighbor on Hulo', location: 'burbank' },
  { id: 't4-tv-writing', medium: 'tv', skill: 'writing', tier: 4, title: "Freelance Episode of 'Murder at the Car Wash'", location: 'burbank' },
  { id: 't4-music-music', medium: 'music', skill: 'music', tier: 4, title: 'Headline a Tuesday at The Silver Spoon Lounge', location: 'silverlake' },
  { id: 't4-music-directing', medium: 'music', skill: 'directing', tier: 4, title: 'Direct a Music Video With One Drone and a Dream', location: 'noho' },
  { id: 't4-tv-music', medium: 'tv', skill: 'music', tier: 4, title: 'Theme Song for a Paramountain+ Baking Competition', location: 'hollywood' },
  { id: 't4-film-music', medium: 'film', skill: 'music', tier: 4, title: 'Compose the Festival-Cut Score for an Indie Drama', location: 'silverlake' },

  // Tier 5: leads, rewrites, showcases, placements.
  { id: 't5-film-acting', medium: 'film', skill: 'acting', tier: 5, title: 'Indie Lead in a Sad Movie About a Sad Lake', location: 'silverlake' },
  { id: 't5-film-writing', medium: 'film', skill: 'writing', tier: 5, title: 'Feature Rewrite for Wonder Bros: "Same, But Different"', location: 'burbank' },
  { id: 't5-film-directing', medium: 'film', skill: 'directing', tier: 5, title: 'Direct an Indie Feature With a Name Actor (Sort Of)', location: 'santamonica' },
  { id: 't5-tv-acting', medium: 'tv', skill: 'acting', tier: 5, title: "Guest Star on 'Hospital Hospital': Patient of the Week", location: 'burbank' },
  { id: 't5-tv-writing', medium: 'tv', skill: 'writing', tier: 5, title: 'Staff Writer on a Streamflix Teen Vampire Drama', location: 'hollywood' },
  { id: 't5-music-music', medium: 'music', skill: 'music', tier: 5, title: 'Label Showcase for Velvet Mixtape Records', location: 'weho' },
  { id: 't5-music-directing', medium: 'music', skill: 'directing', tier: 5, title: 'Direct a Music Video for a Viral One-Hit Wonder', location: 'hollywood' },
  { id: 't5-tv-music', medium: 'tv', skill: 'music', tier: 5, title: 'Song Placed in a TV Drama During a Rainy Breakup', location: 'burbank' },
  { id: 't5-film-music', medium: 'film', skill: 'music', tier: 5, title: 'Soundtrack Single for a Coming-of-Age Indie', location: 'santamonica' },

  // Tier 6: regulars, story editors, Friday nights.
  { id: 't6-film-acting', medium: 'film', skill: 'acting', tier: 6, title: 'Villain in a B25 Elevated Horror (It Is About Grief)', location: 'silverlake' },
  { id: 't6-film-writing', medium: 'film', skill: 'writing', tier: 6, title: 'Adapt a Bestselling Novel Nobody Finished', location: 'santamonica' },
  { id: 't6-film-directing', medium: 'film', skill: 'directing', tier: 6, title: 'Direct a Mid-Budget Studio Thriller (A Rare Species)', location: 'burbank' },
  { id: 't6-tv-acting', medium: 'tv', skill: 'acting', tier: 6, title: 'Series Regular on a Hulo Comedy About a Startup', location: 'burbank' },
  { id: 't6-tv-writing', medium: 'tv', skill: 'writing', tier: 6, title: 'Story Editor on a Prestige Drama of Long Pauses', location: 'hollywood' },
  { id: 't6-music-music', medium: 'music', skill: 'music', tier: 6, title: 'Co-Headline The Whiskey Wobble on a Friday', location: 'weho' },
  { id: 't6-music-directing', medium: 'music', skill: 'directing', tier: 6, title: 'Direct a One-Take Music Video in a Parking Garage', location: 'noho' },
  { id: 't6-tv-music', medium: 'tv', skill: 'music', tier: 6, title: 'Song Placed in a Season Finale Slow-Mo Montage', location: 'burbank' },
  { id: 't6-film-music', medium: 'film', skill: 'music', tier: 6, title: 'Score a Wonder Bros Animated Film About Socks', location: 'burbank' },

  // Tier 7: sequels, spinoffs, and a budget line for a horse.
  { id: 't7-film-acting', medium: 'film', skill: 'acting', tier: 7, title: "Co-Lead in Paramountain's Heist Sequel, Heist Again", location: 'burbank' },
  { id: 't7-film-writing', medium: 'film', skill: 'writing', tier: 7, title: 'Write the Spinoff About the Side Villain', location: 'burbank' },
  { id: 't7-film-directing', medium: 'film', skill: 'directing', tier: 7, title: 'Direct a Festival Opener Shot in Black and White', location: 'santamonica' },
  { id: 't7-tv-acting', medium: 'tv', skill: 'acting', tier: 7, title: 'Lead in a Streamflix Limited Series With Accents', location: 'hollywood' },
  { id: 't7-tv-writing', medium: 'tv', skill: 'writing', tier: 7, title: 'Co-EP on a Hit, Mostly Approving Font Choices', location: 'burbank' },
  { id: 't7-music-music', medium: 'music', skill: 'music', tier: 7, title: 'Sell Out the Hollywood Pantheon, Two Nights', location: 'hollywood' },
  { id: 't7-music-directing', medium: 'music', skill: 'directing', tier: 7, title: 'Direct a Music Video With a Line Item for a Horse', location: 'silverlake' },
  { id: 't7-tv-music', medium: 'tv', skill: 'music', tier: 7, title: 'Original Song for a Prestige Opening Title Sequence', location: 'hollywood' },
  { id: 't7-film-music', medium: 'film', skill: 'music', tier: 7, title: 'Score a Prestige Biopic of a Fictional Inventor', location: 'santamonica' },

  // Tier 8: awards bait and bidding wars.
  { id: 't8-film-acting', medium: 'film', skill: 'acting', tier: 8, title: 'Awards-Bait Lead: Learn Cello, Cry in a Field', location: 'santamonica' },
  { id: 't8-film-writing', medium: 'film', skill: 'writing', tier: 8, title: 'Original Screenplay Sold in a Weekend Bidding War', location: 'hollywood' },
  { id: 't8-film-directing', medium: 'film', skill: 'directing', tier: 8, title: 'Direct the Superhero Reboot of the Reboot', location: 'burbank' },
  { id: 't8-tv-acting', medium: 'tv', skill: 'acting', tier: 8, title: "Title Role in Network Drama 'Dr. Hunch'", location: 'burbank' },
  { id: 't8-tv-writing', medium: 'tv', skill: 'writing', tier: 8, title: "Run the Room on a Hulo Hit's Second Season", location: 'hollywood' },
  { id: 't8-music-music', medium: 'music', skill: 'music', tier: 8, title: 'Main Stage at Sunsetstock, Golden Hour Slot', location: 'hollywood' },
  { id: 't8-music-directing', medium: 'music', skill: 'directing', tier: 8, title: "Direct a Pop Star's Visual Album in Four Deserts", location: 'weho' },
  { id: 't8-tv-music', medium: 'tv', skill: 'music', tier: 8, title: 'Song Placed in a TV Finale, Charts by Morning', location: 'burbank' },
  { id: 't8-film-music', medium: 'film', skill: 'music', tier: 8, title: 'Score a Space Epic With a Mandatory Choir', location: 'burbank' },

  // Tier 9: universes, overall deals, amphitheatres.
  { id: 't9-film-acting', medium: 'film', skill: 'acting', tier: 9, title: 'Franchise Lead: Sign for Nine Films and a Theme Ride', location: 'burbank' },
  { id: 't9-film-writing', medium: 'film', skill: 'writing', tier: 9, title: 'Write the Cinematic Universe Bible (400 Pages)', location: 'burbank' },
  { id: 't9-film-directing', medium: 'film', skill: 'directing', tier: 9, title: 'Direct a Four-Hour Auteur Epic With Intermission', location: 'santamonica' },
  { id: 't9-tv-acting', medium: 'tv', skill: 'acting', tier: 9, title: 'Lead and EP on a Streamflix Flagship Drama', location: 'hollywood' },
  { id: 't9-tv-writing', medium: 'tv', skill: 'writing', tier: 9, title: 'Create a Show Under an Overall Deal at Paramountain+', location: 'hollywood' },
  { id: 't9-music-music', medium: 'music', skill: 'music', tier: 9, title: 'Headline the Hillside Bowl, Three Nights', location: 'hollywood' },
  { id: 't9-music-directing', medium: 'music', skill: 'directing', tier: 9, title: "Direct a Superstar's 14-Minute Music Video Epic", location: 'silverlake' },
  { id: 't9-tv-music', medium: 'tv', skill: 'music', tier: 9, title: 'Write the Sitcom Theme the Whole Country Hums', location: 'burbank' },
  { id: 't9-film-music', medium: 'film', skill: 'music', tier: 9, title: 'Lead Single on a Blockbuster Soundtrack', location: 'santamonica' },

  // Tier 10: the top of the call sheet.
  { id: 't10-film-acting', medium: 'film', skill: 'acting', tier: 10, title: 'Studio Lead: Opening-Weekend Face of Wonder Bros', location: 'burbank' },
  { id: 't10-film-writing', medium: 'film', skill: 'writing', tier: 10, title: 'A-List Writer: Final Draft on a Trilogy Capper', location: 'santamonica' },
  { id: 't10-film-directing', medium: 'film', skill: 'directing', tier: 10, title: 'A-List Director: Final Cut and Your Own Golf Cart', location: 'burbank' },
  { id: 't10-tv-acting', medium: 'tv', skill: 'acting', tier: 10, title: 'Highest-Paid Lead on Streamflix, Per Episode', location: 'hollywood' },
  { id: 't10-tv-writing', medium: 'tv', skill: 'writing', tier: 10, title: 'Showrunner: Your Name Above the Title', location: 'burbank' },
  { id: 't10-music-music', medium: 'music', skill: 'music', tier: 10, title: 'Arena Headliner: The MegaDome, Sold Out Twice', location: 'weho' },
  { id: 't10-music-directing', medium: 'music', skill: 'directing', tier: 10, title: 'Direct a Music Video That Premieres Like a Movie', location: 'hollywood' },
  { id: 't10-tv-music', medium: 'tv', skill: 'music', tier: 10, title: 'Theme Song for the Biggest Show on Streamflix', location: 'burbank' },
  { id: 't10-film-music', medium: 'film', skill: 'music', tier: 10, title: 'Score the Tentpole: Two Orchestras and a Gong', location: 'santamonica' },
];
